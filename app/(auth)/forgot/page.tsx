"use client";

import Link from "next/link";
import { useState } from "react";
import { authErrorAr } from "@/lib/auth-errors";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ForgotPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim();
    setBusy(true);
    setError("");
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setBusy(false);
    if (error) setError(authErrorAr(error.message));
    else setSent(true);
  }

  return (
    <>
      <h1 className="mb-1 text-2xl font-bold">نسيت كلمة المرور</h1>
      <p className="mb-6 text-muted">نرسل لك رابطاً لتعيين كلمة مرور جديدة. تقدّمك محفوظ ولن يتأثر.</p>
      {sent ? (
        <p className="leading-8">إذا كان الإيميل مسجّلاً، ستصلك رسالة خلال دقائق. افحص مجلد الرسائل غير المرغوبة أيضاً.</p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              الإيميل
            </label>
            <input id="email" name="email" type="email" required className="input en" dir="ltr" />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>
            إرسال الرابط
          </button>
        </form>
      )}
      <p className="mt-6 text-sm">
        <Link href="/login" className="text-muted hover:text-text">
          رجوع لتسجيل الدخول
        </Link>
      </p>
    </>
  );
}
