import type { SupabaseClient } from "@supabase/supabase-js";
import { UNIT_PATHS } from "./content";
import type { Unit } from "./types";

/** The unit after this one in the same section, for the "next lesson" button. */
export async function nextUnitHref(supabase: SupabaseClient, unit: Unit): Promise<string | null> {
  const { data } = await supabase
    .from("units")
    .select("id, slug")
    .eq("type", unit.type)
    .eq("published", true)
    .eq("archived", false)
    .order("sort_order")
    .order("created_at");
  const list = (data ?? []) as { id: string; slug: string }[];
  const i = list.findIndex((u) => u.id === unit.id);
  const next = i >= 0 ? list[i + 1] : undefined;
  return next ? `${UNIT_PATHS[unit.type]}/${next.slug}` : null;
}
