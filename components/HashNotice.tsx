"use client";

import { useEffect, useState } from "react";

function translate(message: string): { ok: boolean; text: string } {
  const m = message.toLowerCase();
  if (m.includes("confirmation link accepted"))
    return {
      ok: true,
      text: "تم تأكيد الرابط الأول ✅ افتح الإيميل الثاني (القديم أو الجديد) واضغط الرابط اللي فيه لإكمال تغيير الإيميل.",
    };
  if (m.includes("expired") || m.includes("invalid")) return { ok: false, text: "الرابط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً." };
  return { ok: true, text: message };
}

/** Shows the message Supabase puts in the URL fragment after an email link (e.g. #message=...). */
export function HashNotice() {
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const message = params.get("message") ?? params.get("error_description");
    if (!message) return;
    setNotice(translate(message));
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  if (!notice) return null;
  return (
    <p className={`mb-4 rounded-lg p-3 text-sm leading-7 ${notice.ok ? "bg-ok/10 text-ok" : "bg-danger/10 text-danger"}`}>
      {notice.text}
    </p>
  );
}
