// npm run db:migrate        -> applies new files in supabase/migrations; on a fresh database it also
//                              saves ADMIN_EMAIL and INVITE_CODE from .env.local
// npm run db:seed           -> the same, then inserts the starter content (never overwrites edits)
// Flags: --up-to 0008       -> stop after migrations whose number is <= 0008
//        --reset-settings   -> overwrite the invite code / admin emails with the .env.local values
import { existsSync } from "node:fs";
import path from "node:path";
import { connectDb } from "./db-url";
import { buildSeedSql, migrationFiles } from "./sql";

const envFile = path.resolve(__dirname, "..", ".env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

async function main() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url || url.includes("YOUR-PASSWORD") || url.includes("[YOUR")) {
    console.error("SUPABASE_DB_URL is missing in .env.local (Supabase → Connect → Session pooler).");
    process.exit(1);
  }

  const db = await connectDb(url);
  try {
    await db.query(`create schema if not exists jumla_meta;
      create table if not exists jumla_meta.migrations (name text primary key, applied_at timestamptz not null default now());`);
    const done = new Set((await db.query<{ name: string }>("select name from jumla_meta.migrations")).rows.map((r) => r.name));

    const upToIndex = process.argv.indexOf("--up-to");
    const upTo = upToIndex >= 0 ? process.argv[upToIndex + 1] : undefined;
    for (const m of migrationFiles()) {
      if (done.has(m.name)) continue;
      if (upTo && m.name.slice(0, upTo.length) > upTo) {
        console.log(`Waiting: ${m.name} (after --up-to ${upTo})`);
        continue;
      }
      process.stdout.write(`Applying ${m.name} ... `);
      await db.query("begin");
      try {
        await db.query(m.sql);
        await db.query("insert into jumla_meta.migrations (name) values ($1)", [m.name]);
        await db.query("commit");
        console.log("ok");
      } catch (err) {
        await db.query("rollback");
        throw err;
      }
    }

    // Settings from .env.local only fill empty values, so changes made later in the
    // admin panel survive every run (unless --reset-settings says otherwise).
    const reset = process.argv.includes("--reset-settings");
    const onlyIfEmpty = reset ? "" : " and value = ''";
    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    if (adminEmail && adminEmail !== "you@example.com") {
      const r = await db.query(
        `update public.app_settings set value = $1, updated_at = now() where key = 'admin_emails'${onlyIfEmpty}`,
        [adminEmail],
      );
      // Promote matching accounts only while the site has no admin yet (or when forced).
      await db.query(
        `update public.profiles set role = 'admin'
         where id in (select id from auth.users where public.is_admin_email(email))
           and ($1 or not exists (select 1 from public.profiles where role = 'admin'))`,
        [reset],
      );
      if (r.rowCount) console.log("Admin email(s) saved.");
    }
    const invite = process.env.INVITE_CODE?.trim();
    if (invite && invite !== "change-me") {
      const r = await db.query(
        `update public.app_settings set value = $1, updated_at = now() where key = 'invite_code'${onlyIfEmpty}`,
        [invite],
      );
      if (r.rowCount) console.log("Invite code saved.");
    }
    const current = await db.query<{ value: string }>("select value from public.app_settings where key = 'invite_code'");
    if (!current.rows[0]?.value) {
      console.warn("⚠ No invite code is set, so anyone with the link can sign up. Set INVITE_CODE in .env.local and run again.");
    }

    if (process.argv.includes("--seed")) {
      process.stdout.write("Inserting starter content ... ");
      await db.query(buildSeedSql());
      console.log("ok");
    }
    console.log("Database is up to date.");
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error("\nMigration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
