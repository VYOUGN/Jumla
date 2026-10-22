// Dates as "YYYY-MM-DD" strings in the learner's own time zone. Streaks and
// daily missions are about the learner's day, not the server's.

const pad = (n: number) => String(n).padStart(2, "0");

export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toUtc(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
  const t = new Date(toUtc(date) + days * 86_400_000);
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole days from a to b (b - a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b) - toUtc(a)) / 86_400_000);
}

/** The Sunday that starts the week containing `date`. */
export function weekStart(date: string): string {
  const dow = new Date(toUtc(date)).getUTCDay();
  return addDays(date, -dow);
}
