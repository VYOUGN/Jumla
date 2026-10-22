import { describe, expect, it } from "vitest";
import { addDays, weekStart } from "@/lib/dates";
import {
  dailyMissions,
  effectiveStreak,
  missionProgress,
  MISSIONS,
  nextStreak,
  summarizeToday,
  xpFor,
  type StreakState,
} from "@/lib/gamification";

const start: StreakState = { current: 0, longest: 0, lastActive: null, freezes: 0 };

describe("streaks", () => {
  it("counts consecutive days and ignores repeats on the same day", () => {
    let s = nextStreak(start, "2026-10-01");
    s = nextStreak(s, "2026-10-01");
    s = nextStreak(s, "2026-10-02");
    expect(s.current).toBe(2);
  });

  it("earns a freeze every 7 days, capped at 2", () => {
    let s = start;
    for (let i = 0; i < 21; i++) s = nextStreak(s, addDays("2026-10-01", i));
    expect(s.current).toBe(21);
    expect(s.freezes).toBe(2);
  });

  it("spends freezes to cover missed days", () => {
    let s: StreakState = { current: 5, longest: 5, lastActive: "2026-10-05", freezes: 1 };
    s = nextStreak(s, "2026-10-07");
    expect(s.current).toBe(6);
    expect(s.freezes).toBe(0);
  });

  it("resets when more days are missed than freezes", () => {
    const s = nextStreak({ current: 9, longest: 9, lastActive: "2026-10-05", freezes: 1 }, "2026-10-09");
    expect(s.current).toBe(1);
    expect(s.longest).toBe(9);
  });

  it("never goes backwards for late (offline) events", () => {
    const s: StreakState = { current: 4, longest: 4, lastActive: "2026-10-10", freezes: 0 };
    expect(nextStreak(s, "2026-10-08")).toEqual(s);
  });

  it("shows a lapsed streak as 0 without changing stored data", () => {
    const stats = { current_streak: 6, last_active_date: "2026-10-01", freezes: 1 };
    expect(effectiveStreak(stats, "2026-10-02")).toBe(6);
    expect(effectiveStreak(stats, "2026-10-03")).toBe(6);
    expect(effectiveStreak(stats, "2026-10-04")).toBe(0);
  });
});

describe("xp and missions", () => {
  it("rewards accuracy", () => {
    expect(xpFor("sentence", 1, null, null)).toBe(10);
    expect(xpFor("sentence", 0.85, null, null)).toBe(7);
    expect(xpFor("sentence", 0.5, null, null)).toBe(5);
    expect(xpFor("question", null, true, null)).toBe(5);
    expect(xpFor("mission", null, null, "accurate_5")).toBe(20);
  });

  it("picks three stable, distinct missions per day with one sentence mission", () => {
    for (let i = 0; i < 60; i++) {
      const date = addDays("2026-01-01", i);
      const a = dailyMissions(date).map((m) => m.id);
      expect(a).toEqual(dailyMissions(date).map((m) => m.id));
      expect(new Set(a).size).toBe(3);
      expect(a.filter((id) => id.startsWith("sentences_"))).toHaveLength(1);
    }
  });

  it("summarizes today and tracks claims, counting each event once", () => {
    const events = [
      { id: "1", kind: "sentence" as const, accuracy: 1, correct: null, mission: null },
      { id: "1", kind: "sentence" as const, accuracy: 1, correct: null, mission: null },
      { id: "2", kind: "sentence" as const, accuracy: 0.9, correct: null, mission: null },
      { id: "3", kind: "mission" as const, accuracy: null, correct: null, mission: "accurate_5" },
    ];
    const t = summarizeToday(events);
    expect(t.sentences).toBe(2);
    expect(t.accurate).toBe(1);
    expect(t.xp).toBe(17);
    const m = MISSIONS.find((x) => x.id === "accurate_5")!;
    expect(missionProgress(m, t)).toEqual({ value: 1, done: false, claimed: true });
  });

  it("starts weeks on Sunday", () => {
    expect(weekStart("2026-10-22")).toBe("2026-10-18");
    expect(weekStart("2026-10-18")).toBe("2026-10-18");
  });
});
