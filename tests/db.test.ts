// Runs the real migrations in an in-memory Postgres (PGlite) with a minimal
// stand-in for Supabase's auth schema and roles, then checks the rules that
// protect progress: idempotent writes, derived stats, streaks, and RLS.

import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { buildSeedSql, migrationFiles } from "../scripts/sql";

// Mirrors the strictest Supabase setup ("automatically expose new tables" off):
// the API roles get nothing by default, so the migrations must grant what the app needs.
const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create schema storage;
  revoke all on schema public from public;
  alter default privileges in schema public revoke execute on functions from public;
  grant usage on schema auth to anon, authenticated;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb,
    last_sign_in_at timestamptz
  );
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
`;

let db: PGlite;

async function as<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${userId ?? ""}', false); set role ${userId ? "authenticated" : "anon"};`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false);");
  }
}

async function signUp(email: string, code?: string): Promise<string> {
  const meta = JSON.stringify({ display_name: email.split("@")[0], ...(code ? { invite_code: code } : {}) });
  const r = await db.query<{ id: string }>("insert into auth.users (email, raw_user_meta_data) values ($1, $2::jsonb) returning id", [email, meta]);
  return r.rows[0].id;
}

const day = (offset: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

let n = 0;
const ev = (patch: Record<string, unknown>) => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
  kind: "sentence",
  accuracy: 1,
  wpm: 30,
  word_count: 5,
  local_date: day(0),
  client_ts: new Date(Date.UTC(2026, 0, 1, 0, 0, n)).toISOString(),
  ...patch,
});

async function record(userId: string, events: unknown[]): Promise<number> {
  return as(userId, async () => {
    const r = await db.query<{ record_events: number }>("select public.record_events($1::jsonb)", [JSON.stringify(events)]);
    return r.rows[0].record_events;
  });
}

async function stats(userId: string) {
  const r = await db.query<Record<string, number | string | null>>("select * from public.user_stats where user_id = $1", [userId]);
  return r.rows[0];
}

let admin: string;
let member: string;
let unitId: string;
let sentenceIds: string[];

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const m of migrationFiles()) await db.exec(m.sql);
  await db.exec(`
    update public.app_settings set value = 'admin@example.com' where key = 'admin_emails';
    update public.app_settings set value = 'let-me-in' where key = 'invite_code';
  `);
  await db.exec(buildSeedSql());
  admin = await signUp("admin@example.com");
  member = await signUp("friend@example.com", "let-me-in");
  const u = await db.query<{ id: string }>("select id from public.units where slug = 'the-lost-key'");
  unitId = u.rows[0].id;
  const s = await db.query<{ id: string }>("select id from public.sentences where unit_id = $1 order by position", [unitId]);
  sentenceIds = s.rows.map((r) => r.id);
}, 60_000);

describe("sign-up", () => {
  it("rejects a wrong invite code", async () => {
    await expect(signUp("stranger@example.com", "guess")).rejects.toThrow(/invalid_invite_code/);
  });

  it("creates a member profile and strips the code from metadata", async () => {
    const p = await db.query<{ role: string }>("select role from public.profiles where id = $1", [member]);
    expect(p.rows[0].role).toBe("member");
    const u = await db.query<{ meta: Record<string, string> }>("select raw_user_meta_data as meta from auth.users where id = $1", [member]);
    expect(u.rows[0].meta.invite_code).toBeUndefined();
    expect(await stats(member)).toBeTruthy();
  });

  it("lets the admin email in without a code, as admin", async () => {
    const p = await db.query<{ role: string }>("select role from public.profiles where id = $1", [admin]);
    expect(p.rows[0].role).toBe("admin");
  });
});

describe("seed", () => {
  it("inserts starter content once and is safe to re-run", async () => {
    const before = await db.query<{ n: number }>("select count(*)::int as n from public.sentences");
    await db.exec(buildSeedSql());
    const after = await db.query<{ n: number }>("select count(*)::int as n from public.sentences");
    expect(after.rows[0].n).toBe(before.rows[0].n);
    expect(before.rows[0].n).toBeGreaterThan(50);
  });
});

describe("record_events", () => {
  it("counts each event once, even when a device resends it", async () => {
    const batch = [
      ev({ item_id: sentenceIds[0], unit_id: unitId, position: 0 }),
      ev({ item_id: sentenceIds[1], unit_id: unitId, position: 1, accuracy: 0.85 }),
    ];
    expect(await record(member, batch)).toBe(2);
    expect(await record(member, batch)).toBe(0);
    expect(await record(member, [...batch, ...batch])).toBe(0);
    const s = await stats(member);
    expect(s.sentences_done).toBe(2);
    expect(s.xp).toBe(17);
    expect(s.words_typed).toBe(10);
  });

  it("skips a malformed event without dropping the rest of the batch", async () => {
    const good = ev({ item_id: sentenceIds[2], unit_id: unitId, position: 2 });
    expect(await record(member, [{ id: "not-a-uuid", kind: "sentence" }, { kind: "nonsense" }, good])).toBe(1);
  });

  it("decides XP on the server, whatever the device claims", async () => {
    const before = Number((await stats(member)).xp);
    await record(member, [ev({ item_id: sentenceIds[3], unit_id: unitId, position: 3, xp: 9999, accuracy: 7 })]);
    expect(Number((await stats(member)).xp) - before).toBe(10);
  });

  it("keeps the best accuracy and never lowers it", async () => {
    await record(member, [ev({ item_id: sentenceIds[1], unit_id: unitId, position: 1, accuracy: 0.5 })]);
    const r = await db.query<{ best_accuracy: number; completions: number }>(
      "select best_accuracy, completions from public.item_progress where user_id = $1 and item_id = $2",
      [member, sentenceIds[1]],
    );
    expect(r.rows[0].best_accuracy).toBeCloseTo(0.85);
    expect(r.rows[0].completions).toBe(2);
  });

  it("moves the resume cursor by the newest client time, not arrival order", async () => {
    await record(member, [ev({ item_id: sentenceIds[5], unit_id: unitId, position: 5, client_ts: "2026-03-02T00:00:00Z" })]);
    await record(member, [ev({ item_id: sentenceIds[4], unit_id: unitId, position: 4, client_ts: "2026-03-01T00:00:00Z" })]);
    const r = await db.query<{ cursor: number }>("select cursor from public.unit_progress where user_id = $1 and unit_id = $2", [member, unitId]);
    expect(r.rows[0].cursor).toBe(5);
  });

  it("pays each daily mission once", async () => {
    const before = Number((await stats(member)).xp);
    const inserted = await record(member, [ev({ kind: "mission", mission: "accurate_5" }), ev({ kind: "mission", mission: "accurate_5" })]);
    expect(inserted).toBe(1);
    expect(Number((await stats(member)).xp) - before).toBe(20);
  });

  it("refuses anonymous callers", async () => {
    await expect(
      as(null, () => db.query("select public.record_events($1::jsonb)", [JSON.stringify([ev({})])])),
    ).rejects.toThrow();
  });
});

describe("streaks", () => {
  it("counts days, spends a freeze for one missed day, resets after more, ignores late events", async () => {
    const id = await signUp("streaky@example.com", "let-me-in");
    for (let d = -30; d <= -24; d++) await record(id, [ev({ local_date: day(d) })]);
    let s = await stats(id);
    expect(s.current_streak).toBe(7);
    expect(s.freezes).toBe(1);

    await record(id, [ev({ local_date: day(-22) })]); // missed -23, freeze covers it
    s = await stats(id);
    expect(s.current_streak).toBe(8);
    expect(s.freezes).toBe(0);

    await record(id, [ev({ local_date: day(-19) })]); // missed two days, no freeze left
    s = await stats(id);
    expect(s.current_streak).toBe(1);
    expect(s.longest_streak).toBe(8);

    await record(id, [ev({ local_date: day(-25) })]); // a late offline event
    expect((await stats(id)).current_streak).toBe(1);
  });
});

describe("row level security", () => {
  it("lets each signed-in person read their own role, the way the site does", async () => {
    const mine = await as(member, () => db.query<{ role: string }>("select role from public.profiles where id = auth.uid()"));
    const theirs = await as(admin, () => db.query<{ role: string }>("select role from public.profiles where id = auth.uid()"));
    expect(mine.rows[0].role).toBe("member");
    expect(theirs.rows[0].role).toBe("admin");
  });

  it("gives signed-out visitors no table access at all", async () => {
    await as(null, async () => {
      await expect(db.query("select * from public.units")).rejects.toThrow(/permission denied/);
      await expect(db.query("select * from public.profiles")).rejects.toThrow(/permission denied/);
    });
  });

  it("lets members read content but not change it", async () => {
    await as(member, async () => {
      const r = await db.query<{ n: number }>("select count(*)::int as n from public.units");
      expect(r.rows[0].n).toBeGreaterThan(0);
      await expect(db.query("insert into public.units (type, slug, title_en) values ('story', 'x', 'X')")).rejects.toThrow();
      const upd = await db.query("update public.sentences set text_en = 'hacked' where unit_id = $1", [unitId]);
      expect(upd.affectedRows ?? 0).toBe(0);
    });
  });

  it("gives nobody a way to delete or edit progress", async () => {
    for (const who of [member, admin]) {
      await as(who, async () => {
        await expect(db.query("delete from public.progress_events")).rejects.toThrow(/permission denied/);
        await expect(db.query("update public.user_stats set xp = 0")).rejects.toThrow(/permission denied/);
        await expect(db.query("truncate public.progress_events")).rejects.toThrow(/permission denied/);
        await expect(
          db.query("insert into public.progress_events (id, user_id, kind, local_date, client_ts) values (gen_random_uuid(), auth.uid(), 'sentence', current_date, now())"),
        ).rejects.toThrow(/permission denied/);
      });
    }
    const r = await db.query<{ n: number }>("select count(*)::int as n from public.progress_events");
    expect(r.rows[0].n).toBeGreaterThan(0);
  });

  it("hides other people's progress from members", async () => {
    await as(member, async () => {
      const r = await db.query<{ n: number }>("select count(*)::int as n from public.progress_events where user_id <> auth.uid()");
      expect(r.rows[0].n).toBe(0);
    });
  });

  it("lets the admin edit content but not hard-delete it", async () => {
    await as(admin, async () => {
      await db.query("update public.sentences set text_ar = 'تعديل' where id = $1", [sentenceIds[0]]);
      await db.query("delete from public.sentences where id = $1", [sentenceIds[0]]).catch(() => undefined);
    });
    const r = await db.query<{ text_ar: string }>("select text_ar from public.sentences where id = $1", [sentenceIds[0]]);
    expect(r.rows[0].text_ar).toBe("تعديل");
  });

  it("stops members from making themselves admin", async () => {
    await as(member, async () => {
      await expect(db.query("update public.profiles set role = 'admin' where id = auth.uid()")).rejects.toThrow(/only an admin/);
      await db.query("update public.profiles set display_name = 'New name' where id = auth.uid()");
    });
    const p = await db.query<{ display_name: string; role: string }>("select display_name, role from public.profiles where id = $1", [member]);
    expect(p.rows[0]).toEqual({ display_name: "New name", role: "member" });
  });

  it("lets a member record the guided tours they finished", async () => {
    await as(member, () => db.query("update public.profiles set tours_seen = array['home'] where id = auth.uid()"));
    const p = await db.query<{ tours_seen: string[] }>("select tours_seen from public.profiles where id = $1", [member]);
    expect(p.rows[0].tours_seen).toEqual(["home"]);
  });

  it("keeps at least one admin", async () => {
    await as(admin, async () => {
      await expect(db.query("update public.profiles set role = 'member' where id = auth.uid()")).rejects.toThrow(/last admin/);
    });
  });

  it("shows the user list only to admins", async () => {
    const asMember = await as(member, () => db.query("select * from public.admin_list_users()"));
    const asAdmin = await as(admin, () => db.query("select * from public.admin_list_users()"));
    expect(asMember.rows).toHaveLength(0);
    expect(asAdmin.rows.length).toBeGreaterThanOrEqual(2);
  });

  it("summarizes per-unit progress for the caller", async () => {
    const r = await as(member, () =>
      db.query<{ total: number; done: number }>("select total, done from public.unit_summaries('story') where unit_id = $1", [unitId]),
    );
    expect(r.rows[0].total).toBe(sentenceIds.length);
    expect(r.rows[0].done).toBe(6);
  });

  it("builds the weekly leaderboard for signed-in users", async () => {
    const r = await as(member, () => db.query<{ xp: number }>("select * from public.weekly_leaderboard($1::date)", [day(-7)]));
    expect(r.rows.length).toBeGreaterThanOrEqual(2);
  });
});
