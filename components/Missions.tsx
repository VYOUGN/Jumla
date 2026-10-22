"use client";

import { useEffect, useRef, useState } from "react";
import { localDate } from "@/lib/dates";
import { dailyMissions, missionProgress, summarizeToday, type TodayEvent, type TodaySummary } from "@/lib/gamification";
import { pendingEvents } from "@/lib/progress/outbox";
import { supabaseBrowser } from "@/lib/supabase/client";
import { IconCheck } from "./icons";
import { useProgress } from "./ProgressProvider";

/** Today's three missions. Completed missions are claimed automatically (once per day, enforced by the server). */
export function Missions({ compact = false }: { compact?: boolean }) {
  const { userId, record, snapshot } = useProgress();
  const [today, setToday] = useState<string | null>(null);
  const [summary, setSummary] = useState<TodaySummary | null>(null);
  const claiming = useRef(new Set<string>());

  useEffect(() => setToday(localDate()), []);

  useEffect(() => {
    if (!today) return;
    let cancelled = false;
    (async () => {
      const [{ data }, local] = await Promise.all([
        supabaseBrowser()
          .from("progress_events")
          .select("id, kind, accuracy, correct, mission")
          .eq("user_id", userId)
          .eq("local_date", today)
          .limit(5000),
        pendingEvents(userId),
      ]);
      if (cancelled) return;
      const events: TodayEvent[] = [...((data ?? []) as TodayEvent[]), ...local.filter((e) => e.local_date === today)];
      setSummary(summarizeToday(events));
    })();
    return () => {
      cancelled = true;
    };
  }, [today, userId, snapshot.lastSyncedAt, snapshot.pending]);

  const missions = today ? dailyMissions(today) : [];

  useEffect(() => {
    if (!summary || !today) return;
    for (const m of dailyMissions(today)) {
      const p = missionProgress(m, summary);
      if (p.done && !p.claimed && !claiming.current.has(m.id)) {
        claiming.current.add(m.id);
        void record({ kind: "mission", mission: m.id });
      }
    }
  }, [summary, today, record]);

  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold">مهام اليوم</h2>
        <span className="text-xs text-muted">تتجدد كل يوم</span>
      </div>
      <ul className={compact ? "space-y-3" : "space-y-4"}>
        {missions.map((m) => {
          const p = summary ? missionProgress(m, summary) : { value: 0, done: false, claimed: false };
          const complete = p.done || p.claimed;
          return (
            <li key={m.id} className="flex items-center gap-3">
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-full border ${
                  complete ? "border-ok/50 bg-ok/10 text-ok" : "border-border text-muted"
                }`}
              >
                {complete ? <IconCheck /> : <span className="en text-xs">{m.xp}</span>}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className={complete ? "text-muted line-through" : ""}>{m.title}</span>
                  <span className="en shrink-0 text-xs text-muted">
                    {complete ? `+${m.xp}` : `${p.value}/${m.target}`}
                  </span>
                </div>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={`h-full rounded-full ${complete ? "bg-ok" : "bg-accent"}`}
                    style={{ width: `${Math.round((Math.min(p.value, m.target) / m.target) * 100)}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
