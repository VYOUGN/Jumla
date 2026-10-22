import type { SupabaseClient } from "@supabase/supabase-js";
import type { Question, Sentence, Unit, UnitType, Word } from "./types";

export type UnitSummary = { unit_id: string; total: number; done: number; completions: number; last_at: string | null };
export type UnitCard = Unit & { total: number; done: number; completions: number; last_at: string | null };

export const UNIT_PATHS: Record<UnitType, string> = {
  story: "/learn/stories",
  passage: "/learn/passages",
  word_list: "/learn/words",
};

export const UNIT_LABELS: Record<UnitType, string> = {
  story: "قصة",
  passage: "نص استماع",
  word_list: "قائمة كلمات",
};

/** Published units of a type (or all types) with the signed-in learner's progress. */
export async function listUnitCards(supabase: SupabaseClient, type?: UnitType): Promise<UnitCard[]> {
  let q = supabase.from("units").select("*").eq("published", true).eq("archived", false);
  if (type) q = q.eq("type", type);
  const [{ data: units, error }, { data: sums }] = await Promise.all([
    q.order("sort_order").order("created_at"),
    supabase.rpc("unit_summaries", { p_type: type ?? null }),
  ]);
  if (error) console.error("[jumla] could not load lessons:", error.message);
  const byId = new Map(((sums ?? []) as UnitSummary[]).map((s) => [s.unit_id, s]));
  return ((units ?? []) as Unit[]).map((u) => {
    const s = byId.get(u.id);
    return { ...u, total: s?.total ?? 0, done: s?.done ?? 0, completions: s?.completions ?? 0, last_at: s?.last_at ?? null };
  });
}

export type PlayerData = {
  unit: Unit;
  sentences: Sentence[];
  questions: Question[];
  words: Word[];
  doneIds: string[];
  cursor: number | null;
};

export async function loadPlayer(
  supabase: SupabaseClient,
  userId: string,
  type: UnitType,
  slug: string,
): Promise<PlayerData | null> {
  const { data: unit } = await supabase
    .from("units")
    .select("*")
    .eq("type", type)
    .eq("slug", decodeURIComponent(slug))
    .eq("archived", false)
    .maybeSingle();
  if (!unit) return null;
  const u = unit as Unit;

  const [sentences, questions, words, done, up] = await Promise.all([
    type === "word_list"
      ? Promise.resolve({ data: [] })
      : supabase.from("sentences").select("*").eq("unit_id", u.id).eq("archived", false).order("position"),
    type === "passage"
      ? supabase.from("questions").select("*").eq("unit_id", u.id).eq("archived", false).order("position")
      : Promise.resolve({ data: [] }),
    type === "word_list"
      ? supabase.from("words").select("*").eq("unit_id", u.id).eq("archived", false).order("position")
      : Promise.resolve({ data: [] }),
    supabase.from("item_progress").select("item_id").eq("user_id", userId).eq("unit_id", u.id),
    supabase.from("unit_progress").select("cursor").eq("user_id", userId).eq("unit_id", u.id).maybeSingle(),
  ]);

  return {
    unit: u,
    sentences: (sentences.data ?? []) as Sentence[],
    questions: (questions.data ?? []) as Question[],
    words: (words.data ?? []) as Word[],
    doneIds: ((done.data ?? []) as { item_id: string }[]).map((d) => d.item_id),
    cursor: (up.data as { cursor: number } | null)?.cursor ?? null,
  };
}

/** Where to start: right after the last item typed, or from the top once finished. */
export function resumeIndex(cursor: number | null, total: number): number {
  if (cursor === null || total === 0) return 0;
  return cursor + 1 < total ? cursor + 1 : 0;
}
