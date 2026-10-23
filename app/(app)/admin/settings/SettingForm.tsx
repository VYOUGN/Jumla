"use client";

import { useState } from "react";
import { saveSetting } from "../actions";

export function SettingForm({
  settingKey,
  title,
  help,
  value,
  generate,
}: {
  settingKey: "invite_code" | "admin_emails";
  title: string;
  help: string;
  value: string;
  generate?: boolean;
}) {
  const [v, setV] = useState(value);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const r = await saveSetting(settingKey, v);
    setMsg(r.ok ? { ok: true, text: "تم الحفظ." } : { ok: false, text: r.error });
  }

  // 12 characters from a 32-letter alphabet without look-alikes (0/o, 1/l/i): about 60 bits.
  function random() {
    const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    const chars = [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
    setV(`${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8, 12)}`);
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3 p-5">
      <h2 className="font-bold">{title}</h2>
      <p className="text-sm leading-6 text-muted">{help}</p>
      <input className="input en" dir="ltr" value={v} onChange={(e) => setV(e.target.value)} />
      <div className="flex items-center gap-2">
        <button className="btn btn-primary btn-sm">حفظ</button>
        {generate && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={random}>
            كود عشوائي
          </button>
        )}
        {msg && <span className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</span>}
      </div>
    </form>
  );
}
