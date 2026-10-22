"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { authErrorAr } from "@/lib/auth-errors";
import { MIN_PASSWORD_LENGTH, newPasswordProblem, PASSWORD_MESSAGES } from "@/lib/passwords";
import { supabaseBrowser } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const confirmState = confirm === "" ? null : confirm === password ? "match" : "mismatch";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = newPasswordProblem(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    const form = new FormData(e.currentTarget);
    const code = String(form.get("code")).trim();
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
      <PasswordField
        label="كلمة المرور"
        name="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
        hint={`${MIN_PASSWORD_LENGTH} أحرف على الأقل، بالإنجليزي.`}
      />
      <PasswordField
        label="تأكيد كلمة المرور"
        name="confirm"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        hint="اكتب نفس كلمة المرور مرة ثانية."
        error={confirmState === "mismatch" ? PASSWORD_MESSAGES.mismatch : null}
        success={confirmState === "match" ? "متطابقتان" : null}
      />
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
