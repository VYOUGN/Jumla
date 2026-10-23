/** Supabase auth messages in Arabic. */
export function authErrorAr(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "الإيميل أو كلمة المرور غير صحيحة.";
  if (m.includes("email not confirmed")) return "أكّد إيميلك أولاً من الرسالة التي وصلتك.";
  if (m.includes("already registered") || m.includes("already been registered")) return "هذا الإيميل مسجّل مسبقاً. سجّل الدخول بدلاً من ذلك.";
  if (m.includes("different from the old password")) return "كلمة المرور الجديدة لازم تختلف عن القديمة.";
  if (m.includes("email") && m.includes("different")) return "هذا هو إيميلك الحالي.";
  if (m.includes("email") && m.includes("invalid")) return "الإيميل غير صحيح.";
  if (m.includes("password") && (m.includes("at least") || m.includes("weak") || m.includes("short")))
    return "كلمة المرور ضعيفة. استخدم 8 أحرف على الأقل.";
  if (m.includes("database error saving new user") || m.includes("invalid_invite_code")) return "كود الدعوة غير صحيح.";
  if (m.includes("rate limit") || m.includes("too many")) return "محاولات كثيرة. انتظر قليلاً ثم جرّب مرة أخرى.";
  if (m.includes("security purposes")) return "انتظر دقيقة قبل ما تطلب رسالة جديدة.";
  if (m.includes("error sending") || m.includes("sending confirmation email") || m.includes("smtp"))
    return "ما قدرنا نرسل الإيميل الآن. جرّب بعد شوي، وإذا تكررت المشكلة أخبر صاحب الموقع.";
  if (m.includes("failed to fetch") || m.includes("network")) return "لا يوجد اتصال بالإنترنت. تأكد من الاتصال وجرّب مرة أخرى.";
  return "حدث خطأ غير متوقع. جرّب مرة أخرى.";
}

const SAME_SITE = "http://same-site.invalid";

/**
 * Only allow redirects to paths on this site. Browsers treat "\" like "/" and
 * drop tabs/newlines, so "/\evil.com" would become "//evil.com"; resolving
 * against a placeholder origin and comparing origins catches all of these.
 */
export function safeNext(next: string | null | undefined, fallback = "/learn"): string {
  if (!next || !next.startsWith("/") || next.includes("\\")) return fallback;
  try {
    const url = new URL(next, SAME_SITE);
    if (url.origin !== SAME_SITE) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
