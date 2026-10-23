import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/auth-errors";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/learn/stories")).toBe("/learn/stories");
    expect(safeNext("/account?tab=1#email")).toBe("/account?tab=1#email");
  });

  it("refuses anything that could leave the site", () => {
    for (const bad of ["//evil.com", "/\\evil.com", "/\t/evil.com", "https://evil.com", "evil.com", "", null, undefined]) {
      expect(safeNext(bad)).toBe("/learn");
    }
  });
});
