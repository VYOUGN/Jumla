import { describe, expect, it } from "vitest";
import { buildHints, tokenize } from "@/lib/words";
import { uuidFrom } from "../scripts/sql";

describe("words", () => {
  it("tokenizes without edge punctuation and keeps contractions", () => {
    expect(tokenize("“Wait,” she said — I’m late!")).toEqual(["Wait", "she", "said", "I'm", "late"]);
  });

  it("builds hints from a glossary and keeps earlier translations", () => {
    const hints = buildHints("The cat's bowl", { the: "الـ", cat: "قطة" }, [
      { w: "bowl", ar: "وعاء" },
    ]);
    expect(hints).toEqual([
      { w: "The", ar: "الـ" },
      { w: "cat's", ar: "قطة" },
      { w: "bowl", ar: "وعاء" },
    ]);
  });

  it("makes stable seed ids", () => {
    expect(uuidFrom("unit:a")).toBe(uuidFrom("unit:a"));
    expect(uuidFrom("unit:a")).not.toBe(uuidFrom("unit:b"));
    expect(uuidFrom("unit:a")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
