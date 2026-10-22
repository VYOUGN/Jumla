"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authErrorAr } from "@/lib/auth-errors";
import { supabaseBrowser } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const code = String(form.get("code")).trim();
    const password = String(form.get("password"));
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }
    setBusy(true);
    setError("");
    const supabase = supabaseBrowser();

    const { data: valid, error: codeError } = await supabase.rpc("check_invite_code", { p_code: code });
    if (codeError || !valid) {
      setError(codeError ? authErrorAr(codeError.message) : "كود الدعوة غير صحيح.");
      setBusy(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: String(form.get("email")).trim(),
      password,
      options: {
        data: { display_name: String(form.get("name")).trim(), invite_code: code },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(authErrorAr(error.message));
      setBusy(false);
      return;
    }
    if (data.session) {
      router.replace("/learn");
      router.refresh();
    } else {
      setCheckEmail(true);
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <p className="leading-8">
        أرسلنا لك رسالة تأكيد على إيميلك. افتحها واضغط الرابط، وبعدها تقدر تبدأ.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">
          اسمك (يظهر لأصحابك)
        </label>
        <input id="name" name="name" required maxLength={40} className="input" autoComplete="nickname" />
      </div>
      <div>
        <label className="label" htmlFor="email">
          الإيميل
        </label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input en" dir="ltr" />
      </div>
      <div>
        <label className="label" htmlFor="password">
          كلمة المرور (8 أحرف على الأقل)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input en"
          dir="ltr"
        />
      </div>
      <div>
        <label className="label" htmlFor="code">
          كود الدعوة
        </label>
        <input id="code" name="code" required autoComplete="off" className="input en" dir="ltr" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "جارٍ إنشاء الحساب…" : "إنشاء الحساب"}
      </button>
    </form>
  );
}
