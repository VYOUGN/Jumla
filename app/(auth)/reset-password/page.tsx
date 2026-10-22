"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { authErrorAr } from "@/lib/auth-errors";
import { MIN_PASSWORD_LENGTH, newPasswordProblem, PASSWORD_MESSAGES } from "@/lib/passwords";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const confirmState = confirm === "" ? null : confirm === password ? "match" : "mismatch";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = newPasswordProblem(password, confirm);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    if (error) {
      setError(
        error.message.toLowerCase().includes("session") ? "افتح الرابط من الإيميل مرة أخرى." : authErrorAr(error.message),
      );
      setBusy(false);
      return;
    }
    router.replace("/learn");
    router.refresh();
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">كلمة مرور جديدة</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <PasswordField
          label="كلمة المرور الجديدة"
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
          error={confirmState === "mismatch" ? PASSWORD_MESSAGES.mismatch : null}
          success={confirmState === "match" ? "متطابقتان" : null}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          حفظ
        </button>
      </form>
    </>
  );
}
