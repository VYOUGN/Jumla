"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authErrorAr } from "@/lib/auth-errors";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("password"));
    if (password.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
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
        <div>
          <label className="label" htmlFor="password">
            كلمة المرور الجديدة
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
        {error && <p className="text-sm text-danger">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          حفظ
        </button>
      </form>
    </>
  );
}
