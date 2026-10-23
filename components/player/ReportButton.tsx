"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IconFlag } from "../icons";
import { useProgress } from "../ProgressProvider";

type Props = {
  unitId: string;
  itemId: string | null;
  itemType: "sentence" | "word" | "question" | "unit";
  /** What the learner was looking at, quoted at the top of the report for the admin. */
  context: string;
};

export function ReportButton({ unitId, itemId, itemType, context }: Props) {
  const { userId } = useProgress();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = String(new FormData(e.currentTarget).get("message")).trim();
    if (!message) return;
    setState("sending");
    const { error } = await supabaseBrowser()
      .from("reports")
      // The database allows 1000 characters; the quoted sentence must not push a report over it.
      .insert({
        unit_id: unitId,
        item_id: itemId,
        item_type: itemType,
        message: `${message}\n\n— ${context}`.slice(0, 1000),
        user_id: userId,
      });
    setState(error ? "error" : "sent");
    if (!error) setTimeout(() => setOpen(false), 1200);
  }

  return (
    <>
      <button
        className="chip hover:text-text"
        onClick={() => {
          setOpen(true);
          setState("idle");
        }}
        title="أبلغ عن خطأ في هذه الجملة"
      >
        <IconFlag /> <span className="hidden sm:inline">أبلغ عن خطأ</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <form className="card w-full max-w-md space-y-4 p-5" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <h2 className="font-bold">أبلغ عن خطأ</h2>
            <p className="en rounded-lg bg-bg p-3 text-sm text-muted">{context}</p>
            <textarea
              name="message"
              required
              maxLength={1000}
              rows={4}
              autoFocus
              className="input"
              placeholder="مثلاً: الترجمة غير دقيقة، أو فيه خطأ إملائي في كلمة…"
            />
            {state === "sent" && <p className="text-sm text-ok">وصل البلاغ، شكراً لك!</p>}
            {state === "error" && <p className="text-sm text-danger">ما قدرنا نرسل البلاغ. جرّب مرة أخرى.</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
                إلغاء
              </button>
              <button className="btn btn-primary btn-sm" disabled={state === "sending" || state === "sent"}>
                إرسال
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
