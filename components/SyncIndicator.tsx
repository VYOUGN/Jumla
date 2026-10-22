"use client";

import Link from "next/link";
import { useProgress } from "./ProgressProvider";

export function SyncIndicator() {
  const { snapshot, flush } = useProgress();
  const { status, pending } = snapshot;

  if (status === "signed_out") {
    return (
      <Link href="/login" className="chip border-danger/40 text-danger" title="تقدّمك محفوظ على هذا الجهاز">
        سجّل الدخول لحفظ {pending} خطوة
      </Link>
    );
  }
  if (pending > 0 && (status === "offline" || status === "error")) {
    return (
      <button
        onClick={() => void flush()}
        className="chip border-flame/40 text-flame"
        title="محفوظ على جهازك، وسيُرسل تلقائياً عند عودة الاتصال"
      >
        ⏳ {pending} بانتظار الاتصال
      </button>
    );
  }
  if (pending > 0 || status === "syncing") {
    return <span className="chip">جارٍ الحفظ…</span>;
  }
  return (
    <span className="chip" title="كل تقدّمك محفوظ">
      <span className="size-1.5 rounded-full bg-ok" /> محفوظ
    </span>
  );
}
