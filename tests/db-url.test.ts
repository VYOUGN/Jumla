import { describe, expect, it } from "vitest";
import { parseDbUrl, passwordCandidates } from "../scripts/db-url";

const host = "aws-0-eu-central-1.pooler.supabase.com";

describe("parseDbUrl", () => {
  it("reads a plain Supabase pooler link", () => {
    expect(parseDbUrl(`postgresql://postgres.abc:Simple123@${host}:5432/postgres`)).toEqual({
      user: "postgres.abc",
      password: "Simple123",
      host,
      port: 5432,
      database: "postgres",
    });
  });

  it("keeps a password with symbols exactly as typed", () => {
    for (const password of ["p@ss#word", "a/b?c", "x:y@z", "100%sure", "we!rd$&*"]) {
      expect(parseDbUrl(`postgresql://postgres.abc:${password}@${host}:6543/postgres`).password).toBe(password);
    }
  });

  it("ignores query options and defaults the port and database", () => {
    const c = parseDbUrl(`postgres://postgres.abc:pw@${host}?sslmode=require`);
    expect(c.port).toBe(5432);
    expect(c.database).toBe("postgres");
  });

  it("tries a percent-encoded password decoded first, then as written", () => {
    expect(passwordCandidates("p%40ss%23word")).toEqual(["p@ss#word", "p%40ss%23word"]);
    expect(passwordCandidates("Simple123")).toEqual(["Simple123"]);
    expect(passwordCandidates("100%sure")).toEqual(["100%sure"]);
  });

  it("rejects links that are not Postgres links", () => {
    expect(() => parseDbUrl("https://abc.supabase.co")).toThrow();
    expect(() => parseDbUrl(`postgresql://${host}:5432/postgres`)).toThrow();
  });
});
