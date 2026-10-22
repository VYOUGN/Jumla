import { describe, expect, it } from "vitest";
import { isEnglishOnly, newPasswordProblem, PASSWORD_MESSAGES, signInPasswordProblem } from "@/lib/passwords";

describe("password rules", () => {
  it("accepts English letters, digits, symbols and spaces only", () => {
    expect(isEnglishOnly("Abc 123 !@#$%^&*()_+-=[]{};:'\",.<>/?\\|`~")).toBe(true);
    expect(isEnglishOnly("كلمة")).toBe(false); // Arabic letters
    expect(isEnglishOnly("abcش")).toBe(false); // one Arabic letter among English
    expect(isEnglishOnly("café")).toBe(false); // accented letter
  });

  it("checks a new password in order: English, length, confirmation", () => {
    expect(newPasswordProblem("كلمةمرور", "كلمةمرور")).toBe(
      PASSWORD_MESSAGES.notEnglish,
    );
    expect(newPasswordProblem("short", "short")).toBe(PASSWORD_MESSAGES.tooShort);
    expect(newPasswordProblem("Password1", "Password2")).toBe(PASSWORD_MESSAGES.mismatch);
    expect(newPasswordProblem("Password1", "Password1")).toBeNull();
  });

  it("only checks the language when signing in", () => {
    expect(signInPasswordProblem("abc")).toBeNull();
    expect(signInPasswordProblem("ابج")).toBe(PASSWORD_MESSAGES.notEnglish);
  });
});
