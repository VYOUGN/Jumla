// Connecting with SUPABASE_DB_URL. The link is split by hand instead of with a
// URL parser, so a password pasted as-is still works when it contains @ # / ? or :.
// A percent-encoded password (%40 for @, the URL standard) works too: we try the
// decoded form first and fall back to the password exactly as written.

import pg from "pg";

export type DbConfig = { user: string; password: string; host: string; port: number; database: string };

/** Splits the link. `password` is exactly as written in the link (not decoded). */
export function parseDbUrl(url: string): DbConfig {
  const m = url.trim().match(/^postgres(?:ql)?:\/\/(.+)$/);
  if (!m) throw new Error("SUPABASE_DB_URL must start with postgresql://");
  const rest = m[1];
  const at = rest.lastIndexOf("@");
  if (at < 0) throw new Error("SUPABASE_DB_URL has no user and password (expected user:password@host)");

  const creds = rest.slice(0, at);
  const colon = creds.indexOf(":");
  const user = colon >= 0 ? creds.slice(0, colon) : creds;
  const password = colon >= 0 ? creds.slice(colon + 1) : "";

  const hostPart = rest.slice(at + 1);
  const slash = hostPart.indexOf("/");
  const hostPort = slash >= 0 ? hostPart.slice(0, slash) : hostPart;
  const database = (slash >= 0 ? hostPart.slice(slash + 1) : "").split("?")[0] || "postgres";
  const [host, port] = hostPort.split(":");

  if (!user || !host) throw new Error("SUPABASE_DB_URL is missing the user or the host");
  return { user, password, host, port: Number(port) || 5432, database };
}

/** Passwords to try, most likely first: percent-decoded (when it decodes), then as written. */
export function passwordCandidates(password: string): string[] {
  try {
    const decoded = decodeURIComponent(password);
    return decoded === password ? [password] : [decoded, password];
  } catch {
    return [password];
  }
}

export async function connectDb(url: string): Promise<pg.Client> {
  const cfg = parseDbUrl(url);
  let lastError: unknown;
  for (const password of passwordCandidates(cfg.password)) {
    const client = new pg.Client({ ...cfg, password, ssl: { rejectUnauthorized: false } });
    try {
      await client.connect();
      return client;
    } catch (err) {
      lastError = err;
      await client.end().catch(() => undefined);
      // Only a rejected password is worth retrying with the other spelling.
      if (!/password authentication failed/i.test(String(err))) throw err;
    }
  }
  throw lastError;
}
