"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveSentences, type SentenceRow } from "@/app/(app)/admin/actions";
import { buildHints } from "@/lib/words";
import { IconPlus } from "../icons";
import { newId, RowTools, SaveBar, useFocusRow, useRows } from "./rows";

export function SentencesEditor({ unitId, initial, focus }: { unitId: string; initial: SentenceRow[]; focus?: string }) {
  const router = useRouter();
  const list = useRows<SentenceRow>(initial);
  const [showArchived, setShowArchived] = useState(false);
  const [bulk, setBulk] = useState("");
  useFocusRow(focus);

  function setText(row: SentenceRow, text_en: string) {
    list.update(row.id, { text_en, word_hints: buildHints(text_en, {}, row.word_hints) });
  }

  function addBulk() {
    const items = bulk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [en, ar = ""] = line.split("|").map((s) => s.trim());
        return { id: newId(), text_en: en, text_ar: ar, word_hints: buildHints(en), archived: false };
      });
    if (items.length) list.add(...items);
    setBulk("");
  }

  async function save() {
    const rows = list.rows.filter((r) => r.text_en.trim() || !list.isNew(r.id));
    const r = await saveSentences(unitId, rows);
    if (r.ok) {
      list.saved(rows.map((x) => x.id));
      router.refresh();
    }
    return r;
  }

  const visible = list.rows.filter((r) => showArchived || !r.archived);
  const archivedCount = list.rows.filter((r) => r.archived).length;

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">الجمل</h2>
        {archivedCount > 0 && (
          <button className="text-sm text-muted hover:text-text" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "إخفاء المؤرشف" : `إظهار المؤرشف (${archivedCount})`}
          </button>
        )}
      </div>
      <p className="mb-4 text-sm leading-6 text-muted">
        معاني الكلمات تُقسَّم تلقائياً من الجملة الإنجليزية، وتبقى ترجماتك محفوظة لكل كلمة حتى لو عدّلت الجملة.
      </p>

      <div className="space-y-3">
        {visible.map((row) => {
          const index = list.rows.indexOf(row);
          return (
            <div
              key={row.id}
              id={`row-${row.id}`}
              className={`card space-y-3 p-4 ${row.archived ? "opacity-60" : ""} ${focus === row.id ? "ring-2 ring-flame" : ""}`}
            >
              <RowTools
                index={index}
                archived={row.archived}
                onMove={(d) => list.move(row.id, d)}
                onArchive={() => list.update(row.id, { archived: !row.archived })}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <textarea
                  className="input en"
                  dir="ltr"
                  rows={2}
                  value={row.text_en}
                  placeholder="English sentence"
                  onChange={(e) => setText(row, e.target.value)}
                />
                <textarea
                  className="input"
                  rows={2}
                  value={row.text_ar}
                  placeholder="الترجمة العربية"
                  onChange={(e) => list.update(row.id, { text_ar: e.target.value })}
                />
              </div>
              {row.word_hints.length > 0 && (
                <div className="flex flex-wrap gap-2" dir="ltr">
                  {row.word_hints.map((h, i) => (
                    <label key={i} className="flex items-center gap-1 rounded-lg border border-border bg-bg px-2 py-1 text-sm">
                      <span className="en text-muted">{h.w}</span>
                      <input
                        dir="rtl"
                        className={`w-24 bg-transparent font-sans outline-none ${h.ar ? "" : "placeholder:text-danger/70"}`}
                        value={h.ar}
                        placeholder="المعنى"
                        onChange={(e) =>
                          list.update(row.id, {
                            word_hints: row.word_hints.map((x, j) => (j === i ? { ...x, ar: e.target.value } : x)),
                          })
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => list.add({ id: newId(), text_en: "", text_ar: "", word_hints: [], archived: false })}
        >
          <IconPlus /> جملة جديدة
        </button>
      </div>

      <details className="card mt-4 p-4">
        <summary className="cursor-pointer text-sm font-semibold">إضافة عدة جمل دفعة واحدة</summary>
        <p className="mt-2 text-sm text-muted">
          سطر لكل جملة بهذا الشكل: <span className="en">English sentence | الترجمة</span>
        </p>
        <textarea className="input mt-3 font-mono text-sm" rows={5} dir="auto" value={bulk} onChange={(e) => setBulk(e.target.value)} />
        <button className="btn btn-ghost btn-sm mt-2" onClick={addBulk} disabled={!bulk.trim()}>
          أضف للقائمة
        </button>
      </details>

      <SaveBar dirty={list.dirty} onSave={save} />
    </section>
  );
}
