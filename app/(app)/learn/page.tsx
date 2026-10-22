import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Missions } from "@/components/Missions";
import { UnitTile } from "@/components/UnitGrid";
import { getStats, requireViewer } from "@/lib/auth";
import { listUnitCards } from "@/lib/content";

export const metadata: Metadata = { title: "الرئيسية" };

export default async function LearnHome() {
  const { supabase, profile } = await requireViewer();
  const [stats, cards] = await Promise.all([getStats(), listUnitCards(supabase)]);

  const inProgress = cards
    .filter((c) => c.last_at && c.done < c.total)
    .sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""))
    .slice(0, 2);
  const fresh = cards.filter((c) => !c.last_at && c.type !== "word_list").slice(0, 3 - inProgress.length);

  const tiles = [
    { label: "الكلمات", value: stats?.words_typed ?? 0 },
    { label: "الجمل", value: stats?.sentences_done ?? 0 },
    { label: "الجلسات", value: stats?.sessions ?? 0 },
    { label: "أطول ستريك", value: stats?.longest_streak ?? 0 },
  ];

  return (
    <AppShell>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">مرحباً، {profile.display_name} 👋</h1>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <div className="en text-3xl font-bold">{t.value.toLocaleString("en")}</div>
            <div className="mt-1 text-sm text-muted">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section>
          <h2 className="mb-4 text-lg font-bold">التالي لك</h2>
          {inProgress.length + fresh.length === 0 ? (
            <p className="card p-6 text-muted">
              أنهيت كل شيء متاح الآن! جرّب{" "}
              <Link href="/learn/words" className="text-accent">
                قوائم الكلمات
              </Link>{" "}
              أو أعد قصة لتحسّن دقتك.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {inProgress.map((u) => (
                <UnitTile key={u.id} unit={u} cta="أكمل" />
              ))}
              {fresh.map((u) => (
                <UnitTile key={u.id} unit={u} cta="ابدأ" />
              ))}
            </div>
          )}
        </section>
        <aside>
          <Missions />
        </aside>
      </div>
    </AppShell>
  );
}
