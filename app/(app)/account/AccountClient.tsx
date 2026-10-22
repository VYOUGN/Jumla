"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PasswordField } from "@/components/PasswordField";
import { useProgress } from "@/components/ProgressProvider";
import { forgetToursOnDevice } from "@/components/tour/Tour";
import { authErrorAr } from "@/lib/auth-errors";
import { MIN_PASSWORD_LENGTH, newPasswordProblem, PASSWORD_MESSAGES } from "@/lib/passwords";
import { pendingEvents } from "@/lib/progress/outbox";
import { supabaseBrowser } from "@/lib/supabase/client";
import { resetTours } from "./actions";

type Msg = { ok: boolean; text: string } | null;

function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <p className={`text-sm leading-7 ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>;
}

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

export function EmailForm({ current, pending }: { current: string; pending: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = email.trim();
    if (next.toLowerCase() === current.toLowerCase()) {
      setMsg({ ok: false, text: "هذا هو إيميلك الحالي." });
      return;
    }
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser(
      { email: next },
      { emailRedirectTo: `${window.location.origin}/auth/callback?next=/account` },
    );
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: authErrorAr(error.message) });
      return;
    }
    setEmail("");
    setMsg({
      ok: true,
      text: "أرسلنا رابط تأكيد إلى إيميلك الجديد، وغالباً رابطاً ثانياً إلى إيميلك الحالي. اضغط الرابط في كل رسالة تصلك، وبعدها يتغيّر الإيميل. حتى ذلك الوقت تبقى تدخل بإيميلك الحالي.",
    });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold">الإيميل</h2>
      <p className="text-sm text-muted">
        إيميلك الحالي: <span className="en text-text">{current}</span>
      </p>
      {pending && (
        <p className="rounded-lg bg-flame/10 p-2 text-sm text-flame">
          بانتظار التأكيد: <span className="en">{pending}</span>. افتح رسالة التأكيد واضغط الرابط.
        </p>
      )}
      <label className="label" htmlFor="new-email">
        الإيميل الجديد
      </label>
      <input
        id="new-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        className="input en"
        dir="ltr"
      />
      <Message msg={msg} />
      <button className="btn btn-ghost btn-sm" disabled={busy}>
        {busy ? "جارٍ الإرسال…" : "غيّر الإيميل"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const confirmState = confirm === "" ? null : confirm === password ? "match" : "mismatch";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const problem = newPasswordProblem(password, confirm);
    if (problem) {
      setMsg({ ok: false, text: problem });
      return;
    }
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMsg({ ok: false, text: authErrorAr(error.message) });
      return;
    }
    setPassword("");
    setConfirm("");
    setMsg({ ok: true, text: "تم تغيير كلمة المرور." });
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold">تغيير كلمة المرور</h2>
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
      <Message msg={msg} />
      <button className="btn btn-ghost btn-sm" disabled={busy}>
        حفظ
      </button>
    </form>
  );
}

export function TourReplay() {
  const router = useRouter();
  const { userId } = useProgress();
  const [pending, start] = useTransition();
  return (
    <section className="card p-5">
      <h2 className="mb-2 font-bold">الجولة التعريفية</h2>
      <p className="text-sm leading-7 text-muted">
        تشرح لك أقسام الموقع، وجولة ثانية تشرح شاشة الدرس أول ما تفتح قصة أو نصاً.
      </p>
      <button
        className="btn btn-ghost btn-sm mt-4"
        disabled={pending}
        onClick={() =>
          start(async () => {
            forgetToursOnDevice(userId);
            await resetTours();
            router.push("/learn");
          })
        }
      >
        أعد الجولة من البداية
      </button>
    </section>
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
