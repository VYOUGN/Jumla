"use server";

// Admin writes. Each action checks the role here, and RLS checks it again in
// the database. Saving revalidates every page so learners see the change on
// their next page load.

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { LEVELS, UNIT_TYPES, type Level, type UnitType } from "@/lib/types";
import type { WordHint } from "@/lib/words";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(error: unknown): ActionResult {
  const msg = typeof error === "object" && error && "message" in error ? String(error.message) : String(error);
  if (msg.includes("units_slug_key") || msg.includes("duplicate key")) return { ok: false, error: "هذا الرابط (slug) مستخدم في درس آخر." };
  if (msg.includes("last admin")) return { ok: false, error: "لا يمكن إزالة آخر مدير." };
  if (msg.includes("cannot delete yourself")) return { ok: false, error: "ما تقدر تحذف حسابك أنت من هنا." };
  if (msg.includes("cannot delete an admin")) return { ok: false, error: "هذا مدير. اجعله عضواً أولاً، ثم احذفه." };
  if (msg.includes("member not found")) return { ok: false, error: "العضو غير موجود، ربما حُذف مسبقاً." };
  return { ok: false, error: msg || "حدث خطأ." };
}

function done(): void {
  revalidatePath("/", "layout");
}

export type UnitInput = {
  id?: string;
  type: UnitType;
  slug: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  level: Level;
  theme: string;
  emoji: string;
  cover_url: string | null;
  sort_order: number;
  published: boolean;
};

export async function saveUnit(input: UnitInput): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) return { ok: false, error: "الرابط (slug) مطلوب: حروف إنجليزية وأرقام وشرطات." };
  if (!input.title_en.trim()) return { ok: false, error: "العنوان الإنجليزي مطلوب." };
  if (!UNIT_TYPES.includes(input.type) || !LEVELS.includes(input.level)) return { ok: false, error: "قيمة غير صالحة." };

  const row = {
    type: input.type,
    slug,
    title_en: input.title_en.trim(),
    title_ar: input.title_ar.trim(),
    description_en: input.description_en.trim(),
    description_ar: input.description_ar.trim(),
    level: input.level,
    theme: input.theme,
    emoji: input.emoji.trim() || "📖",
    cover_url: input.cover_url?.trim() || null,
    sort_order: Number.isFinite(input.sort_order) ? Math.round(input.sort_order) : 0,
    published: input.published,
  };

  if (input.id) {
    const { error } = await supabase.from("units").update(row).eq("id", input.id);
    if (error) return fail(error);
    done();
    return { ok: true, id: input.id };
  }
  const { data, error } = await supabase.from("units").insert(row).select("id").single();
  if (error) return fail(error);
  done();
  return { ok: true, id: (data as { id: string }).id };
}

export async function setUnitArchived(id: string, archived: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("units").update({ archived }).eq("id", id);
  if (error) return fail(error);
  done();
  return { ok: true };
}

export type SentenceRow = { id: string; text_en: string; text_ar: string; word_hints: WordHint[]; archived: boolean };
export type QuestionRow = {
  id: string;
  prompt_en: string;
  prompt_ar: string;
  options: string[];
  correct_index: number;
  archived: boolean;
};
export type WordRow = {
  id: string;
  word: string;
  translation_ar: string;
  example_en: string;
  example_ar: string;
  archived: boolean;
};

function checkIds(rows: { id: string }[]): string | null {
  return rows.every((r) => UUID.test(r.id)) ? null : "معرّف غير صالح.";
}

export async function saveSentences(unitId: string, rows: SentenceRow[]): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const bad = checkIds(rows);
  if (bad) return { ok: false, error: bad };
  const clean = rows
    .filter((r) => r.text_en.trim() || !r.archived)
    .map((r, position) => ({
      id: r.id,
      unit_id: unitId,
      position,
      text_en: r.text_en.replace(/\s+/g, " ").trim(),
      text_ar: r.text_ar.trim(),
      word_hints: r.word_hints,
      archived: r.archived || !r.text_en.trim(),
    }));
  if (!clean.length) return { ok: true };
  const { error } = await supabase.from("sentences").upsert(clean, { onConflict: "id" });
  if (error) return fail(error);
  done();
  return { ok: true };
}

export async function saveQuestions(unitId: string, rows: QuestionRow[]): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const bad = checkIds(rows);
  if (bad) return { ok: false, error: bad };
  const clean = rows.map((r, position) => {
    const options = r.options.map((o) => o.trim()).filter(Boolean);
    return {
      id: r.id,
      unit_id: unitId,
      position,
      prompt_en: r.prompt_en.trim(),
      prompt_ar: r.prompt_ar.trim(),
      options,
      correct_index: Math.min(Math.max(0, r.correct_index), Math.max(0, options.length - 1)),
      archived: r.archived || !r.prompt_en.trim() || options.length < 2,
    };
  });
  if (!clean.length) return { ok: true };
  const { error } = await supabase.from("questions").upsert(clean, { onConflict: "id" });
  if (error) return fail(error);
  done();
  return { ok: true };
}

export async function saveWords(unitId: string, rows: WordRow[]): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const bad = checkIds(rows);
  if (bad) return { ok: false, error: bad };
  const clean = rows.map((r, position) => ({
    id: r.id,
    unit_id: unitId,
    position,
    word: r.word.trim(),
    translation_ar: r.translation_ar.trim(),
    example_en: r.example_en.trim(),
    example_ar: r.example_ar.trim(),
    archived: r.archived || !r.word.trim(),
  }));
  if (!clean.length) return { ok: true };
  const { error } = await supabase.from("words").upsert(clean, { onConflict: "id" });
  if (error) return fail(error);
  done();
  return { ok: true };
}

export async function setReportStatus(id: string, resolved: boolean): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("reports")
    .update({ status: resolved ? "resolved" : "open", resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return fail(error);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function setRole(userId: string, role: "admin" | "member"): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return fail(error);
  done();
  return { ok: true };
}

/** Deletes a member's account (not their progress rows); see migration 0007. */
export async function deleteMember(userId: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  if (!UUID.test(userId)) return { ok: false, error: "معرّف غير صالح." };
  const { error } = await supabase.rpc("admin_delete_user", { p_user: userId });
  if (error) return fail(error);
  done();
  return { ok: true };
}

export async function saveSetting(key: "invite_code" | "admin_emails", value: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const v = value.trim();
  if (key === "invite_code" && v.length < 4) return { ok: false, error: "الكود يجب أن يكون 4 أحرف على الأقل." };
  const { error } = await supabase.from("app_settings").update({ value: v, updated_at: new Date().toISOString() }).eq("key", key);
  if (error) return fail(error);
  revalidatePath("/admin", "layout");
  return { ok: true };
}
