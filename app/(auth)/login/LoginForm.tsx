"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { ResendConfirmation } from "@/components/ResendConfirmation";
import { authErrorAr } from "@/lib/auth-errors";
import { signInPasswordProblem } from "@/lib/passwords";
import { supabaseBrowser } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = signInPasswordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError("");
    setUnconfirmed(false);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setUnconfirmed(error.message.toLowerCase().includes("email not confirmed"));
      setError(authErrorAr(error.message));
      setBusy(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          الإيميل
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="input en"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <PasswordField
        label="كلمة المرور"
        name="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      {unconfirmed && (
        <div className="rounded-lg bg-flame/10 p-3 text-sm leading-7">
          <p className="mb-2">افتح رسالة التأكيد اللي وصلتك واضغط الرابط. ما لقيتها؟ افحص مجلد Spam، أو اطلب رسالة جديدة:</p>
          <ResendConfirmation email={email.trim()} />
        </div>
      )}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "جارٍ الدخول…" : "دخول"}
      </button>
    </form>
  );
}
