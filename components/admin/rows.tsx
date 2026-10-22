"use client";

import { useEffect, useRef, useState } from "react";
import type { ActionResult } from "@/app/(app)/admin/actions";
import { IconArchive, IconDown, IconUp } from "../icons";

export function newId(): string {
  return crypto.randomUUID();
}

/** Editable list state shared by the sentence, question and word editors. */
export function useRows<T extends { id: string; archived: boolean }>(initial: T[]) {
  const [rows, setRows] = useState<T[]>(initial);
  const [dirty, setDirty] = useState(false);
  const known = useRef(new Set(initial.map((r) => r.id)));

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(next: (rs: T[]) => T[]) {
    setRows(next);
    setDirty(true);
  }

  return {
    rows,
    dirty,
    update: (id: string, patch: Partial<T>) => change((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    move: (id: string, dir: -1 | 1) =>
      change((rs) => {
        const i = rs.findIndex((r) => r.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= rs.length) return rs;
        const copy = [...rs];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        return copy;
      }),
    add: (...items: T[]) => change((rs) => [...rs, ...items]),
    isNew: (id: string) => !known.current.has(id),
    saved: (ids: string[]) => {
      ids.forEach((id) => known.current.add(id));
      setDirty(false);
    },
  };
}

export function RowTools({
  index,
  archived,
  onMove,
  onArchive,
}: {
  index: number;
  archived: boolean;
  onMove: (dir: -1 | 1) => void;
  onArchive: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="en w-7 text-sm text-muted">{index + 1}</span>
      <button type="button" className="chip px-1.5" onClick={() => onMove(-1)} aria-label="لأعلى">
        <IconUp />
      </button>
      <button type="button" className="chip px-1.5" onClick={() => onMove(1)} aria-label="لأسفل">
        <IconDown />
      </button>
      <button
        type="button"
        className={`chip ${archived ? "border-ok/40 text-ok" : "hover:text-danger"}`}
        onClick={onArchive}
        title={archived ? "استرجاع" : "أرشفة (يختفي عن المتعلمين، ويبقى التقدّم المرتبط به)"}
      >
        <IconArchive /> {archived ? "استرجاع" : "أرشفة"}
      </button>
    </div>
  );
}

export function SaveBar({
  dirty,
  onSave,
  label = "حفظ التغييرات",
}: {
  dirty: boolean;
  onSave: () => Promise<ActionResult>;
  label?: string;
}) {
  const [state, setState] = useState<{ busy: boolean; msg: string; ok: boolean }>({ busy: false, msg: "", ok: true });
  async function save() {
    setState({ busy: true, msg: "", ok: true });
    const r = await onSave();
    setState({ busy: false, ok: r.ok, msg: r.ok ? "تم الحفظ. التعديل ظاهر للجميع الآن." : r.error });
  }
  return (
    <div className="sticky bottom-20 z-10 mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface-2/95 px-4 py-3 backdrop-blur lg:bottom-4">
      <span className={`text-sm ${state.ok ? "text-muted" : "text-danger"}`}>
        {state.msg || (dirty ? "عندك تغييرات غير محفوظة" : "لا توجد تغييرات")}
      </span>
      <button className="btn btn-primary btn-sm ms-auto" disabled={!dirty || state.busy} onClick={() => void save()}>
        {state.busy ? "جارٍ الحفظ…" : label}
      </button>
    </div>
  );
}

/** Scrolls to and highlights the row a report pointed at. */
export function useFocusRow(focus: string | undefined) {
  useEffect(() => {
    if (!focus) return;
    document.getElementById(`row-${focus}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus]);
}
