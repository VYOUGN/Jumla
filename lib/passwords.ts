// Password rules shared by every password form.

export const MIN_PASSWORD_LENGTH = 8;

// Printable ASCII: English letters, digits, symbols and space.
const ENGLISH_ONLY = /^[\x20-\x7E]*$/;

export function isEnglishOnly(text: string): boolean {
  return ENGLISH_ONLY.test(text);
}

export const PASSWORD_MESSAGES = {
  notEnglish: "كلمة المرور لازم تكون بالإنجليزي: حروف إنجليزية وأرقام ورموز فقط. يبدو أن لوحة المفاتيح على العربي.",
  tooShort: `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} أحرف على الأقل.`,
  mismatch: "كلمتا المرور غير متطابقتين.",
} as const;

/** The first problem with a password typed to sign in, or null. */
export function signInPasswordProblem(password: string): string | null {
  return isEnglishOnly(password) ? null : PASSWORD_MESSAGES.notEnglish;
}

/** The first problem with a new password and its confirmation, or null. */
export function newPasswordProblem(password: string, confirm: string): string | null {
  if (!isEnglishOnly(password)) return PASSWORD_MESSAGES.notEnglish;
  if (password.length < MIN_PASSWORD_LENGTH) return PASSWORD_MESSAGES.tooShort;
  if (password !== confirm) return PASSWORD_MESSAGES.mismatch;
  return null;
}
