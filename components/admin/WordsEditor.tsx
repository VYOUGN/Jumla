"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveWords, type WordRow } from "@/app/(app)/(shell)/admin/actions";
import { IconPlus } from "../icons";
import { newId, RowTools, SaveBar, useFocusRow, useRows } from "./rows";

export function WordsEditor({ unitId, initial, focus }: { unitId: string; initial: WordRow[]; focus?: string }) {
  const router = useRouter();
  const list = useRows<WordRow>(initial);
  const [showArchived, setShowArchived] = useState(false);
  const [bulk, setBulk] = useState("");
  useFocusRow(focus);

  function addBulk() {
    const items = bulk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const [word, ar = "", ex = "", exAr = ""] = line.split("|").map((s) => s.trim());
        return { id: newId(), word, translation_ar: ar, example_en: ex, example_ar: exAr, archived: false };
      });
    if (items.length) list.add(...items);
    setBulk("");
  }

  async function save() {
    const rows = list.rows.filter((r) => r.word.trim() || !list.isNew(r.id));
    const r = await saveWords(unitId, rows);
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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">الكلمات</h2>
        {archivedCount > 0 && (
          <button className="text-sm text-muted hover:text-text" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "إخفاء المؤرشف" : `إظهار المؤرشف (${archivedCount})`}
          </button>
        )}
      </div>
      <div className="space-y-3">
        {visible.map((w) => {
          const index = list.rows.indexOf(w);
          return (
            <div
              key={w.id}
              id={`row-${w.id}`}
              className={`card space-y-3 p-4 ${w.archived ? "opacity-60" : ""} ${focus === w.id ? "ring-2 ring-flame" : ""}`}
            >
              <RowTools
                index={index}
                archived={w.archived}
                onMove={(d) => list.move(w.id, d)}
                onArchive={() => list.update(w.id, { archived: !w.archived })}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="input en"
                  dir="ltr"
                  value={w.word}
                  placeholder="word"
                  onChange={(e) => list.update(w.id, { word: e.target.value })}
                />
                <input
                  className="input"
                  value={w.translation_ar}
                  placeholder="المعنى"
                  onChange={(e) => list.update(w.id, { translation_ar: e.target.value })}
                />
                <input
                  className="input en"
                  dir="ltr"
                  value={w.example_en}
                  placeholder="Example sentence"
                  onChange={(e) => list.update(w.id, { example_en: e.target.value })}
                />
                <input
                  className="input"
                  value={w.example_ar}
                  placeholder="ترجمة المثال"
                  onChange={(e) => list.update(w.id, { example_ar: e.target.value })}
                />
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="btn btn-ghost btn-sm mt-4"
        onClick={() => list.add({ id: newId(), word: "", translation_ar: "", example_en: "", example_ar: "", archived: false })}
      >
        <IconPlus /> كلمة جديدة
      </button>
      <details className="card mt-4 p-4">
        <summary className="cursor-pointer text-sm font-semibold">إضافة عدة كلمات دفعة واحدة</summary>
        <p className="mt-2 text-sm text-muted">
          سطر لكل كلمة: <span className="en">word | المعنى | example | ترجمة المثال</span>
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
