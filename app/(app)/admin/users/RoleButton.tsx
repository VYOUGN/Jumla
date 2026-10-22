"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setRole } from "../actions";

export function RoleButton({ id, role, self }: { id: string; role: "admin" | "member"; self: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const next = role === "admin" ? "member" : "admin";

  return (
    <div className="flex items-center gap-2">
      <span className={`chip ${role === "admin" ? "border-accent/40 text-accent" : ""}`}>{role === "admin" ? "مدير" : "عضو"}</span>
      <button
        className="text-xs text-muted hover:text-text disabled:opacity-50"
        disabled={pending}
        onClick={() => {
          const q = next === "admin" ? "إعطاء صلاحيات المدير لهذا الشخص؟" : self ? "إزالة صلاحيات المدير منك أنت؟" : "إزالة صلاحيات المدير؟";
          if (!confirm(q)) return;
          start(async () => {
            const r = await setRole(id, next);
            if (!r.ok) setError(r.error);
            else router.refresh();
          });
        }}
      >
        {next === "admin" ? "اجعله مديراً" : "اجعله عضواً"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
