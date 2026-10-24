import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/AppShell";
import { IconPlus } from "@/components/icons";
import { requireAdmin } from "@/lib/auth";
import { UNIT_LABELS, UNIT_PATHS } from "@/lib/content";
import { UNIT_TYPES, type Unit, type UnitType } from "@/lib/types";

export const metadata: Metadata = { title: "المحتوى" };

const TITLES: Record<UnitType, string> = { story: "القصص", passage: "النصوص", word_list: "قوائم الكلمات" };

export default async function AdminUnitsPage({ searchParams }: { searchParams: Promise<{ type?: string; archived?: string }> }) {
  const sp = await searchParams;
  const type: UnitType = UNIT_TYPES.includes(sp.type as UnitType) ? (sp.type as UnitType) : "story";
  const showArchived = sp.archived === "1";
  const { supabase } = await requireAdmin();

  const itemTable = type === "word_list" ? "words" : "sentences";
  const { data } = await supabase
    .from("units")
    .select("*")
    .eq("type", type)
    .eq("archived", showArchived)
    .order("sort_order")
    .order("created_at");
  const units = (data ?? []) as Unit[];
  // One head-count per unit: exact even past the API's row limit.
  const counted = await Promise.all(
    units.map(async (u) => {
      const { count } = await supabase
        .from(itemTable)
        .select("id", { count: "exact", head: true })
        .eq("unit_id", u.id)
        .eq("archived", false);
      return [u.id, count ?? 0] as const;
    }),
  );
  const counts = new Map<string, number>(counted);

  return (
    <>
      <PageTitle title={showArchived ? `${TITLES[type]} المؤرشفة` : TITLES[type]}>
        <div className="flex gap-2">
          <Link href={`/admin/units?type=${type}${showArchived ? "" : "&archived=1"}`} className="btn btn-ghost btn-sm">
            {showArchived ? "رجوع للنشطة" : "عرض المؤرشف"}
          </Link>
          <Link href={`/admin/units/new?type=${type}`} className="btn btn-primary btn-sm">
            <IconPlus /> {UNIT_LABELS[type]} جديدة
          </Link>
        </div>
      </PageTitle>
      <div className="card divide-y divide-border">
        {units.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="text-2xl">{u.emoji}</span>
            <div className="min-w-0 flex-1">
              <Link href={`/admin/units/${u.id}`} className="en font-semibold hover:text-accent">
                {u.title_en}
              </Link>
              <p className="truncate text-sm text-muted">{u.title_ar}</p>
            </div>
            <span className="chip en">{u.level}</span>
            <span className="chip">
              <span className="en">{counts.get(u.id) ?? 0}</span> {type === "word_list" ? "كلمة" : "جملة"}
            </span>
            {!u.published && <span className="chip border-flame/40 text-flame">مسودة</span>}
            <Link href={`/admin/units/${u.id}`} className="btn btn-ghost btn-sm">
              تعديل
            </Link>
            {u.published && !u.archived && (
              <Link href={`${UNIT_PATHS[type]}/${u.slug}`} className="btn btn-ghost btn-sm">
                معاينة
              </Link>
            )}
          </div>
        ))}
        {!units.length && <p className="p-6 text-muted">{showArchived ? "لا يوجد شيء مؤرشف." : "لا يوجد محتوى بعد."}</p>}
      </div>
    </>
  );
}
