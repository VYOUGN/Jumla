"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveQuestions, type QuestionRow } from "@/app/(app)/admin/actions";
import { IconPlus } from "../icons";
import { newId, RowTools, SaveBar, useFocusRow, useRows } from "./rows";

export function QuestionsEditor({ unitId, initial, focus }: { unitId: string; initial: QuestionRow[]; focus?: string }) {
  const router = useRouter();
  const list = useRows<QuestionRow>(initial);
  const [showArchived, setShowArchived] = useState(false);
  useFocusRow(focus);

  async function save() {
    const rows = list.rows.filter((r) => r.prompt_en.trim() || !list.isNew(r.id));
    const r = await saveQuestions(unitId, rows);
    if (r.ok) {
      list.saved(rows.map((x) => x.id));
      router.refresh();
    }
    return r;
  }

  const visible = list.rows.filter((r) => showArchived || !r.archived);
  const archivedCount = list.rows.filter((r) => r.archived).length;

  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">أسئلة الفهم</h2>
        {archivedCount > 0 && (
          <button className="text-sm text-muted hover:text-text" onClick={() => setShowArchived((v) => !v)}>
            {showArchived ? "إخفاء المؤرشف" : `إظهار المؤرشف (${archivedCount})`}
          </button>
        )}
      </div>
      <div className="space-y-3">
        {visible.map((q) => {
          const index = list.rows.indexOf(q);
          return (
            <div
              key={q.id}
              id={`row-${q.id}`}
              className={`card space-y-3 p-4 ${q.archived ? "opacity-60" : ""} ${focus === q.id ? "ring-2 ring-flame" : ""}`}
            >
              <RowTools
                index={index}
                archived={q.archived}
                onMove={(d) => list.move(q.id, d)}
                onArchive={() => list.update(q.id, { archived: !q.archived })}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="input en"
                  dir="ltr"
                  value={q.prompt_en}
                  placeholder="Question in English"
                  onChange={(e) => list.update(q.id, { prompt_en: e.target.value })}
                />
                <input
                  className="input"
                  value={q.prompt_ar}
                  placeholder="ترجمة السؤال"
                  onChange={(e) => list.update(q.id, { prompt_ar: e.target.value })}
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2" dir="ltr">
                {q.options.map((opt, i) => (
                  <label key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correct_index === i}
                      onChange={() => list.update(q.id, { correct_index: i })}
                      className="accent-[var(--color-ok)]"
                      title="الإجابة الصحيحة"
                    />
                    <input
                      className="input en"
                      value={opt}
                      placeholder={`Option ${i + 1}`}
                      onChange={(e) => list.update(q.id, { options: q.options.map((o, j) => (j === i ? e.target.value : o)) })}
                    />
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted">اختر الدائرة بجانب الإجابة الصحيحة. الخيارات الفارغة تُحذف عند الحفظ.</p>
            </div>
          );
        })}
      </div>
      <button
        className="btn btn-ghost btn-sm mt-4"
        onClick={() =>
          list.add({ id: newId(), prompt_en: "", prompt_ar: "", options: ["", "", "", ""], correct_index: 0, archived: false })
        }
      >
        <IconPlus /> سؤال جديد
      </button>
      <SaveBar dirty={list.dirty} onSave={save} label="حفظ الأسئلة" />
    </section>
  );
}
