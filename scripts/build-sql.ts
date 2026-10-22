// npm run sql:build -> writes supabase/seed.sql and supabase/setup.sql
import { writeFileSync } from "node:fs";
import path from "node:path";
import { buildSeedSql, buildSetupSql } from "./sql";

const dir = path.resolve(__dirname, "..", "supabase");
writeFileSync(path.join(dir, "seed.sql"), buildSeedSql());
writeFileSync(path.join(dir, "setup.sql"), buildSetupSql());
console.log("Wrote supabase/seed.sql and supabase/setup.sql");
