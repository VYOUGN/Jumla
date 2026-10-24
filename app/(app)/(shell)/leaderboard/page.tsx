import type { Metadata } from "next";
import Link from "next/link";
import { PageTitle } from "@/components/AppShell";
import { IconFlame } from "@/components/icons";
import { requireViewer } from "@/lib/auth";
import { localDate, weekStart } from "@/lib/dates";
import { effectiveStreak } from "@/lib/gamification";

export const metadata: Metadata = { title: "الترتيب" };

type Row = { user_id: string; display_name: string; xp: number; current_streak: number; last_active_date: string | null; freezes: number };

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range } = await searchParams;
  const allTime = range === "all";
  const { supabase, user } = await requireViewer();
  const today = localDate();

  let rows: Row[] = [];
  if (allTime) {
    const [{ data: profiles }, { data: stats }] = await Promise.all([
      supabase.from("profiles").select("id, display_name"),
      supabase.from("user_stats").select("user_id, xp, current_streak, last_active_date, freezes"),
    ]);
    const names = new Map(((profiles ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]));
    rows = ((stats ?? []) as Omit<Row, "display_name">[])
      .filter((s) => names.has(s.user_id))
      .map((s) => ({ ...s, display_name: names.get(s.user_id) ?? "" }))
      .sort((a, b) => b.xp - a.xp);
  } else {
    const { data } = await supabase.rpc("weekly_leaderboard", { p_from: weekStart(today) });
    rows = ((data ?? []) as Row[]).map((r) => ({ ...r, xp: Number(r.xp) }));
  }

  return (
    <>
      <PageTitle title="الترتيب" subtitle="من جمع أكثر نقاط؟ الأسبوع يبدأ يوم الأحد." />
      <div className="mb-5 flex gap-2">
        <Link href="/leaderboard" className={`chip ${!allTime ? "border-accent text-accent" : ""}`}>
          هذا الأسبوع
        </Link>
        <Link href="/leaderboard?range=all" className={`chip ${allTime ? "border-accent text-accent" : ""}`}>
          كل الأوقات
        </Link>
      </div>
      <ol className="card divide-y divide-border">
        {rows.map((r, i) => {
          const me = r.user_id === user.id;
          const streak = effectiveStreak(r, today);
          return (
            <li key={r.user_id} className={`flex items-center gap-4 px-4 py-3 ${me ? "bg-accent/5" : ""}`}>
              <span className="en w-6 text-center text-lg font-bold text-muted">
                {i < 3 && r.xp > 0 ? ["🥇", "🥈", "🥉"][i] : i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate font-semibold">
                {r.display_name || "بدون اسم"} {me && <span className="text-sm font-normal text-accent">(أنت)</span>}
              </span>
              <span className={`chip ${streak > 0 ? "text-flame" : ""}`}>
                <IconFlame /> <span className="en">{streak}</span>
              </span>
              <span className="en w-20 text-end font-bold">{r.xp.toLocaleString("en")}</span>
            </li>
          );
        })}
        {!rows.length && <li className="p-6 text-muted">لا يوجد أحد بعد.</li>}
      </ol>
    </>
  );
}
