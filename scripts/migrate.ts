// npm run db:migrate        -> applies new files in supabase/migrations and the settings from .env.local
// npm run db:seed           -> the same, then inserts the starter content (never overwrites edits)
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

    for (const m of migrationFiles()) {
      if (done.has(m.name)) continue;
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

    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    if (adminEmail && adminEmail !== "you@example.com") {
      await db.query("update public.app_settings set value = $1, updated_at = now() where key = 'admin_emails'", [adminEmail]);
      await db.query(
        "update public.profiles set role = 'admin' where id in (select id from auth.users where public.is_admin_email(email))",
      );
      console.log(`Admin email(s): ${adminEmail}`);
    }
    const invite = process.env.INVITE_CODE?.trim();
    if (invite && invite !== "change-me") {
      await db.query("update public.app_settings set value = $1, updated_at = now() where key = 'invite_code'", [invite]);
      console.log("Invite code saved.");
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
