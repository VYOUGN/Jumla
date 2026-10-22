"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PasswordField } from "@/components/PasswordField";
import { authErrorAr } from "@/lib/auth-errors";
import { signInPasswordProblem } from "@/lib/passwords";
import { supabaseBrowser } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = signInPasswordProblem(password);
    if (problem) {
      setError(problem);
      return;
    }
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const { error } = await supabaseBrowser().auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password,
    });
    if (error) {
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
        <input id="email" name="email" type="email" required autoComplete="email" className="input en" dir="ltr" />
      </div>
      <PasswordField
        label="كلمة المرور"
        name="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button className="btn btn-primary w-full" disabled={busy}>
        {busy ? "جارٍ الدخول…" : "دخول"}
      </button>
    </form>
  );
}
