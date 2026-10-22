import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionsEditor } from "@/components/admin/QuestionsEditor";
import { SentencesEditor } from "@/components/admin/SentencesEditor";
import { UnitForm } from "@/components/admin/UnitForm";
import { WordsEditor } from "@/components/admin/WordsEditor";
import { requireAdmin } from "@/lib/auth";
import { UNIT_LABELS, UNIT_PATHS } from "@/lib/content";
import { UNIT_TYPES, type Question, type Sentence, type Unit, type UnitType, type Word } from "@/lib/types";

export const metadata: Metadata = { title: "تعديل درس" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function EditUnitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string; focus?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireAdmin();

  if (id === "new") {
    const type: UnitType = UNIT_TYPES.includes(sp.type as UnitType) ? (sp.type as UnitType) : "story";
    return (
      <>
        <Back type={type} />
        <h1 className="mb-5 text-2xl font-bold">{UNIT_LABELS[type]} جديدة</h1>
        <UnitForm unit={null} type={type} />
        <p className="mt-4 text-sm text-muted">بعد الإنشاء تقدر تضيف المحتوى.</p>
      </>
    );
  }
  if (!UUID.test(id)) notFound();

  const { data } = await supabase.from("units").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const unit = data as Unit;

  const [sentences, questions, words] = await Promise.all([
    unit.type !== "word_list" ? supabase.from("sentences").select("*").eq("unit_id", id).order("position") : null,
    unit.type === "passage" ? supabase.from("questions").select("*").eq("unit_id", id).order("position") : null,
    unit.type === "word_list" ? supabase.from("words").select("*").eq("unit_id", id).order("position") : null,
  ]);

  return (
    <>
      <Back type={unit.type} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <h1 className="en text-2xl font-bold">{unit.title_en}</h1>
        {unit.archived && <span className="chip border-danger/40 text-danger">مؤرشف</span>}
        {!unit.published && <span className="chip border-flame/40 text-flame">مسودة</span>}
        {!unit.archived && (
          <Link href={`${UNIT_PATHS[unit.type]}/${unit.slug}`} className="btn btn-ghost btn-sm ms-auto">
            معاينة كمتعلّم
          </Link>
        )}
      </div>
      <UnitForm key={unit.updated_at} unit={unit} type={unit.type} />
      {sentences && (
        <SentencesEditor
          unitId={unit.id}
          focus={sp.focus}
          initial={((sentences.data ?? []) as Sentence[]).map((s) => ({
            id: s.id,
            text_en: s.text_en,
            text_ar: s.text_ar,
            word_hints: s.word_hints ?? [],
            archived: s.archived,
          }))}
        />
      )}
      {questions && (
        <QuestionsEditor
          unitId={unit.id}
          focus={sp.focus}
          initial={((questions.data ?? []) as Question[]).map((q) => ({
            id: q.id,
            prompt_en: q.prompt_en,
            prompt_ar: q.prompt_ar,
            options: [...q.options, "", "", "", ""].slice(0, Math.max(4, q.options.length)),
            correct_index: q.correct_index,
            archived: q.archived,
          }))}
        />
      )}
      {words && (
        <WordsEditor
          unitId={unit.id}
          focus={sp.focus}
          initial={((words.data ?? []) as Word[]).map((w) => ({
            id: w.id,
            word: w.word,
            translation_ar: w.translation_ar,
            example_en: w.example_en,
            example_ar: w.example_ar,
            archived: w.archived,
          }))}
        />
      )}
    </>
  );
}

function Back({ type }: { type: UnitType }) {
  return (
    <Link href={`/admin/units?type=${type}`} className="mb-4 inline-block text-sm text-muted hover:text-text">
      → رجوع للقائمة
    </Link>
  );
}
