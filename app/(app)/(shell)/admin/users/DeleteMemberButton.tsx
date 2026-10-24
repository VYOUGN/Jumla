"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteMember } from "../actions";

export function DeleteMemberButton({ id, name, email }: { id: string; name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const cancelButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        className="text-xs text-danger hover:underline"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        حذف
      </button>
      {open && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4"
          onClick={() => !pending && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`delete-${id}`}
        >
          <div className="card w-full max-w-md animate-pop space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
            <h2 id={`delete-${id}`} className="text-lg font-bold">
              حذف «{name || "بدون اسم"}»؟
            </h2>
            <p className="en text-sm text-muted">{email}</p>
            <ul className="list-disc space-y-1 ps-5 text-sm leading-7 text-muted">
              <li>يُحذف حسابه ولا يقدر يسجّل الدخول بعدها.</li>
              <li>يختفي من قائمة المستخدمين ومن الترتيب.</li>
              <li>سجل تقدّمه يبقى محفوظاً في قاعدة البيانات، لكن إذا سجّل من جديد يبدأ بحساب جديد.</li>
            </ul>
            {error && <p className="text-sm text-danger">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                className="btn btn-sm bg-danger text-white hover:opacity-90"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const r = await deleteMember(id);
                    if (!r.ok) {
                      setError(r.error);
                      return;
                    }
                    setOpen(false);
                    router.refresh();
                  })
                }
              >
                {pending ? "جارٍ الحذف…" : "نعم، احذف الحساب"}
              </button>
              <button ref={cancelButton} className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setOpen(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
