"use client";

import { useEffect, useState } from "react";
import { localDate } from "@/lib/dates";
import { effectiveStreak, practicedToday } from "@/lib/gamification";
import type { UserStats } from "@/lib/types";
import { IconFlame, IconStar } from "./icons";

/** Today's date on the learner's device (null during the server render). */
export function useToday(): string | null {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(localDate()), []);
  return today;
}

export function StatBadges({ stats }: { stats: UserStats | null }) {
  const today = useToday();
  const streak = stats ? (today ? effectiveStreak(stats, today) : stats.current_streak) : 0;
  const lit = Boolean(stats && today && practicedToday(stats, today));
  return (
    <>
      <span
        className={`chip ${lit ? "border-flame/40 text-flame" : ""}`}
        title={lit ? "تدرّبت اليوم" : "تدرّب اليوم لتحافظ على الستريك"}
      >
        <IconFlame />
        <span className="en font-semibold">{streak}</span>
        {stats && stats.freezes > 0 && (
          <span className="text-sky-300" title={`عندك ${stats.freezes} تجميد يحمي الستريك`}>
            ❄{stats.freezes}
          </span>
        )}
      </span>
      <span className="chip" title="نقاط الخبرة">
        <IconStar className="text-accent" />
        <span className="en font-semibold">{stats?.xp ?? 0}</span>
      </span>
    </>
  );
}
