"use client";

import { useEffect, useState } from "react";
import { authErrorAr } from "@/lib/auth-errors";
import { supabaseBrowser } from "@/lib/supabase/client";

const COOLDOWN_SECONDS = 60;

/** Sends the sign-up confirmation email again, at most once a minute. */
export function ResendConfirmation({ email }: { email: string }) {
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);

  async function resend() {
    if (!email) {
      setMsg({ ok: false, text: "اكتب إيميلك في الخانة فوق أولاً." });
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabaseBrowser().auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: authErrorAr(error.message) });
      return;
    }
    setMsg({ ok: true, text: "أرسلنا رسالة جديدة. افحص مجلد البريد غير المرغوب فيه (Spam) أيضاً." });
    setLeft(COOLDOWN_SECONDS);
  }

  return (
    <div className="space-y-2">
      <button type="button" className="btn btn-ghost btn-sm" disabled={busy || left > 0} onClick={() => void resend()}>
        {left > 0 ? `أعد الإرسال بعد ${left} ثانية` : busy ? "جارٍ الإرسال…" : "أعد إرسال رسالة التأكيد"}
      </button>
      {msg && <p className={`text-sm leading-7 ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
    </div>
  );
}
