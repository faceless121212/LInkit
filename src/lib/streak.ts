import { addDays, format, parse, subDays } from "date-fns";
import { APP_TIMEZONE } from "@/lib/config/reminders";
import { dayKeyInTz } from "@/lib/tz";

/**
 * Current publishing streak: consecutive calendar days in `tz` with at least
 * one published post, ending today, or ending yesterday when nothing has been
 * published yet today (so the streak does not read as 0 every morning).
 */
export function computeStreak(publishedAt: (string | Date)[], now: Date = new Date(), tz: string = APP_TIMEZONE): number {
  const days = new Set(publishedAt.map((d) => dayKeyInTz(d, tz)));
  if (days.size === 0) return 0;

  const todayKey = dayKeyInTz(now, tz);
  let cursor = parse(todayKey, "yyyy-MM-dd", new Date());
  if (!days.has(todayKey)) {
    cursor = subDays(cursor, 1);
    if (!days.has(format(cursor, "yyyy-MM-dd"))) return 0;
  }

  let streak = 0;
  while (days.has(format(cursor, "yyyy-MM-dd"))) {
    streak += 1;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

/** Longest run of consecutive days ever, for a secondary stat. */
export function longestStreak(publishedAt: (string | Date)[], tz: string = APP_TIMEZONE): number {
  const keys = [...new Set(publishedAt.map((d) => dayKeyInTz(d, tz)))].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of keys) {
    const d = parse(key, "yyyy-MM-dd", new Date());
    run = prev && format(addDays(prev, 1), "yyyy-MM-dd") === key ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}
