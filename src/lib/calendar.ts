import { addDays, addMonths, addWeeks, format, parse, startOfMonth, startOfWeek } from "date-fns";
import { calendarInstant } from "@/lib/posts/display";
import { dayKeyInTz } from "@/lib/tz";
import type { Post } from "@/lib/types";

export type CalendarView = "month" | "week";

const KEY = "yyyy-MM-dd";

/** Parses a yyyy-MM-dd key as a plain calendar date (no timezone meaning). */
export function parseDayKey(key: string): Date {
  return parse(key, KEY, new Date());
}

export function formatDayKey(d: Date): string {
  return format(d, KEY);
}

export function isValidDayKey(key: string | undefined): key is string {
  return !!key && /^\d{4}-\d{2}-\d{2}$/.test(key) && !Number.isNaN(parseDayKey(key).getTime());
}

/** 6 rows x 7 columns of day keys covering the month of `anchorKey`, weeks starting Monday. */
export function monthGrid(anchorKey: string): string[][] {
  const first = startOfWeek(startOfMonth(parseDayKey(anchorKey)), { weekStartsOn: 1 });
  const rows: string[][] = [];
  for (let r = 0; r < 6; r++) {
    rows.push(Array.from({ length: 7 }, (_, c) => formatDayKey(addDays(first, r * 7 + c))));
  }
  return rows;
}

/** 7 day keys for the week (Monday start) containing `anchorKey`. */
export function weekDays(anchorKey: string): string[] {
  const first = startOfWeek(parseDayKey(anchorKey), { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => formatDayKey(addDays(first, i)));
}

export function shiftAnchor(anchorKey: string, view: CalendarView, delta: number): string {
  const d = parseDayKey(anchorKey);
  return formatDayKey(view === "month" ? addMonths(d, delta) : addWeeks(d, delta));
}

/**
 * Buckets posts by the calendar day (in `tz`) of their scheduled_at, or
 * published_at when published. Posts without a date are skipped.
 */
export function bucketByDay<T extends Pick<Post, "status" | "scheduled_at" | "published_at">>(
  posts: T[],
  tz: string,
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const post of posts) {
    const instant = calendarInstant(post);
    if (!instant) continue;
    const key = dayKeyInTz(instant, tz);
    const list = map.get(key);
    if (list) list.push(post);
    else map.set(key, [post]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => (calendarInstant(a) ?? "").localeCompare(calendarInstant(b) ?? ""));
  }
  return map;
}
