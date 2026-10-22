"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProgress } from "@/components/ProgressProvider";
import { authErrorAr } from "@/lib/auth-errors";
import { pendingEvents } from "@/lib/progress/outbox";
import { supabaseBrowser } from "@/lib/supabase/client";

export function SyncPanel() {
  const { snapshot, flush } = useProgress();
  const labels: Record<string, string> = {
    idle: "كل تقدّمك محفوظ على الخادم.",
    syncing: "جارٍ الحفظ…",
    offline: "لا يوجد اتصال. تقدّمك محفوظ على هذا الجهاز وسيُرسل تلقائياً.",
    error: "الخادم لم يرد. تقدّمك محفوظ على هذا الجهاز وسنعيد المحاولة تلقائياً.",
    signed_out: "انتهت الجلسة. سجّل الدخول وسيُرسل المحفوظ على هذا الجهاز.",
  };
  return (
    <section className="card p-5">
      <h2 className="mb-2 font-bold">حالة الحفظ</h2>
      <p className="text-muted">{labels[snapshot.status]}</p>
      {snapshot.pending > 0 && (
        <p className="mt-2 text-sm">
          بانتظار الإرسال: <span className="en">{snapshot.pending}</span>
        </p>
      )}
      <button className="btn btn-ghost btn-sm mt-4" onClick={() => void flush()}>
        أرسل الآن
      </button>
    </section>
  );
}

export function PasswordForm() {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const password = String(new FormData(form).get("password"));
    if (password.length < 8) {
      setMsg({ ok: false, text: "كلمة المرور يجب أن تكون 8 أحرف على الأقل." });
      return;
    }
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setMsg(error ? { ok: false, text: authErrorAr(error.message) } : { ok: true, text: "تم تغيير كلمة المرور." });
    if (!error) form.reset();
  }
  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold">تغيير كلمة المرور</h2>
      <input name="password" type="password" minLength={8} required autoComplete="new-password" className="input en" dir="ltr" placeholder="••••••••" />
      {msg && <p className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
      <button className="btn btn-ghost btn-sm">حفظ</button>
    </form>
  );
}

export function SignOutButton() {
  const router = useRouter();
  const { flush, snapshot, userId } = useProgress();
  const [warn, setWarn] = useState(false);

  async function signOut(force = false) {
    await flush();
    if (!force && (await pendingEvents(userId)).length > 0) {
      setWarn(true);
      return;
    }
    await supabaseBrowser().auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <div>
      <button className="btn btn-danger" onClick={() => void signOut()}>
        تسجيل الخروج
      </button>
      {warn && (
        <div className="mt-3 rounded-lg bg-flame/10 p-3 text-sm text-flame">
          <p>
            عندك <span className="en">{snapshot.pending}</span> خطوات لم تصل للخادم بعد. ستبقى محفوظة على هذا الجهاز وتُرسل عند
            دخولك مرة أخرى منه.
          </p>
          <button className="btn btn-ghost btn-sm mt-2" onClick={() => void signOut(true)}>
            اخرج على أي حال
          </button>
        </div>
      )}
    </div>
  );
}
