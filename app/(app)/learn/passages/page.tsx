import type { Metadata } from "next";
import Link from "next/link";
import { AppShell, PageTitle } from "@/components/AppShell";
import { UnitGrid } from "@/components/UnitGrid";
import { requireViewer } from "@/lib/auth";
import { listUnitCards } from "@/lib/content";
import { LEVEL_LABELS } from "@/lib/gamification";
import { LEVELS, type Level } from "@/lib/types";

export const metadata: Metadata = { title: "النصوص" };

export default async function PassagesPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level } = await searchParams;
  const { supabase } = await requireViewer();
  const all = await listUnitCards(supabase, "passage");
  const present = LEVELS.filter((l) => all.some((u) => u.level === l));
  const active = present.includes(level as Level) ? (level as Level) : null;
  const units = active ? all.filter((u) => u.level === active) : all;

  return (
    <AppShell>
      <PageTitle
        title="النصوص"
        subtitle="نصوص قصيرة لتدريب أذنك: استمع أولاً، اكتب ما تسمعه، ثم أجب عن أسئلة الفهم."
      />
      {present.length > 1 && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Link href="/learn/passages" className={`chip ${!active ? "border-accent text-accent" : ""}`}>
            الكل
          </Link>
          {present.map((l) => (
            <Link
              key={l}
              href={`/learn/passages?level=${l}`}
              className={`chip ${active === l ? "border-accent text-accent" : ""}`}
            >
              <span className="en">{l}</span> {LEVEL_LABELS[l]}
            </Link>
          ))}
        </div>
      )}
      <UnitGrid units={units} />
    </AppShell>
  );
}
