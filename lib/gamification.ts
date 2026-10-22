// XP, streaks and daily missions. The database (supabase/migrations/0002_functions.sql)
// is the authority; these mirrors drive the UI before the server answers.

import { daysBetween } from "./dates";
import type { EventKind, Level, UserStats } from "./types";

// --- XP (keep in sync with public.xp_for / public.mission_xp) ---------------

export function xpFor(kind: EventKind, accuracy: number | null, correct: boolean | null, mission: string | null): number {
  const acc = accuracy ?? 0;
  switch (kind) {
    case "sentence":
      return acc >= 0.95 ? 10 : acc >= 0.8 ? 7 : 5;
    case "word":
      return acc >= 0.95 ? 4 : 2;
    case "question":
      return correct ? 5 : 1;
    case "unit_complete":
      return 20;
    case "mission":
      return MISSIONS.find((m) => m.id === mission)?.xp ?? 0;
  }
}

// --- Streaks (keep in sync with public.apply_progress_event) ----------------

export type StreakState = { current: number; longest: number; lastActive: string | null; freezes: number };

export const MAX_FREEZES = 2;

/** Streak after practising on `date`. Practice dated on/before lastActive changes nothing. */
export function nextStreak(s: StreakState, date: string): StreakState {
  if (s.lastActive === null) return { ...s, current: 1, longest: Math.max(s.longest, 1), lastActive: date };
  const gap = daysBetween(s.lastActive, date) - 1;
  if (gap < 0) return s;

  let { current, freezes } = s;
  if (gap === 0) current += 1;
  else if (freezes >= gap) {
    freezes -= gap;
    current += 1;
  } else current = 1;
  if (current % 7 === 0) freezes = Math.min(freezes + 1, MAX_FREEZES);
  return { current, freezes, lastActive: date, longest: Math.max(s.longest, current) };
}

/**
 * The streak to show today. The stored number only changes when the learner
 * practises, so a streak that has lapsed (more missed days than freezes) reads 0.
 */
export function effectiveStreak(stats: Pick<UserStats, "current_streak" | "last_active_date" | "freezes">, today: string): number {
  if (!stats.last_active_date) return 0;
  const missed = daysBetween(stats.last_active_date, today) - 1;
  if (missed <= 0) return stats.current_streak;
  return missed <= stats.freezes ? stats.current_streak : 0;
}

export function practicedToday(stats: Pick<UserStats, "last_active_date">, today: string): boolean {
  return stats.last_active_date === today;
}

// --- Daily missions ----------------------------------------------------------

export type TodayEvent = {
  id: string;
  kind: EventKind;
  accuracy: number | null;
  correct: boolean | null;
  mission: string | null;
};

export type TodaySummary = {
  sentences: number;
  accurate: number;
  words: number;
  questionsCorrect: number;
  units: number;
  /** XP earned from practice today (mission rewards excluded). */
  xp: number;
  claimed: Set<string>;
};

export type Mission = {
  id: string;
  title: string;
  target: number;
  xp: number;
  value: (t: TodaySummary) => number;
};

export const MISSIONS: Mission[] = [
  { id: "sentences_10", title: "اكتب 10 جمل", target: 10, xp: 15, value: (t) => t.sentences },
  { id: "sentences_25", title: "اكتب 25 جملة", target: 25, xp: 30, value: (t) => t.sentences },
  { id: "accurate_5", title: "5 جمل بدقة 95% أو أكثر", target: 5, xp: 20, value: (t) => t.accurate },
  { id: "finish_unit", title: "أنهِ درساً كاملاً", target: 1, xp: 25, value: (t) => t.units },
  { id: "words_10", title: "اكتب 10 كلمات من القوائم", target: 10, xp: 15, value: (t) => t.words },
  { id: "questions_3", title: "أجب عن 3 أسئلة فهم صحيحة", target: 3, xp: 15, value: (t) => t.questionsCorrect },
  { id: "xp_100", title: "اجمع 100 نقطة اليوم", target: 100, xp: 25, value: (t) => t.xp },
];

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Three missions for the day, the same for everyone and stable all day. */
export function dailyMissions(date: string): Mission[] {
  const pool = [...MISSIONS];
  const picked: Mission[] = [];
  let seed = hash(date);
  // Always one sentence mission so every day is doable from any lesson type.
  const firstIdx = seed % 2;
  picked.push(pool.splice(firstIdx, 1)[0]);
  while (picked.length < 3) {
    seed = hash(`${date}:${seed}`);
    const m = pool.splice(seed % pool.length, 1)[0];
    if (m.id.startsWith("sentences_") && picked.some((p) => p.id.startsWith("sentences_"))) continue;
    picked.push(m);
  }
  return picked;
}

export function summarizeToday(events: TodayEvent[]): TodaySummary {
  const seen = new Set<string>();
  const t: TodaySummary = { sentences: 0, accurate: 0, words: 0, questionsCorrect: 0, units: 0, xp: 0, claimed: new Set() };
  for (const e of events) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    if (e.kind === "mission") {
      if (e.mission) t.claimed.add(e.mission);
      continue;
    }
    t.xp += xpFor(e.kind, e.accuracy, e.correct, null);
    if (e.kind === "sentence") {
      t.sentences++;
      if ((e.accuracy ?? 0) >= 0.95) t.accurate++;
    } else if (e.kind === "word") t.words++;
    else if (e.kind === "question" && e.correct) t.questionsCorrect++;
    else if (e.kind === "unit_complete") t.units++;
  }
  return t;
}

export function missionProgress(m: Mission, t: TodaySummary): { value: number; done: boolean; claimed: boolean } {
  const value = Math.min(m.value(t), m.target);
  return { value, done: value >= m.target, claimed: t.claimed.has(m.id) };
}

// --- Labels -------------------------------------------------------------------

export const LEVEL_LABELS: Record<Level, string> = {
  A1: "مبتدئ",
  A2: "مبتدئ متقدّم",
  B1: "متوسط",
  B2: "فوق المتوسط",
  C1: "متقدّم",
};

