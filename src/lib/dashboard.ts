import { endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/config/reminders";
import { isOverdue } from "@/lib/posts/display";
import { computeStreak, longestStreak } from "@/lib/streak";
import type { PostWithItems } from "@/lib/types";

export type DashboardStats = {
  ideas: number;
  drafts: number;
  scheduledThisWeek: number;
  publishedThisMonth: number;
  streak: number;
  longestStreak: number;
  overdue: PostWithItems[];
  upcoming: PostWithItems[];
};

/** Start/end instants of the current Monday–Sunday week and calendar month in the app timezone. */
export function currentRanges(now: Date = new Date(), tz: string = APP_TIMEZONE) {
  const zoned = toZonedTime(now, tz);
  const weekStart = fromZonedTime(startOfWeek(zoned, { weekStartsOn: 1 }), tz);
  const weekEnd = fromZonedTime(endOfWeek(zoned, { weekStartsOn: 1 }), tz);
  const monthStart = fromZonedTime(startOfMonth(zoned), tz);
  const monthEnd = fromZonedTime(endOfMonth(zoned), tz);
  return { weekStart, weekEnd, monthStart, monthEnd };
}

function within(iso: string | null, start: Date, end: Date): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= start.getTime() && t <= end.getTime();
}

export function computeDashboard(posts: PostWithItems[], now: Date = new Date()): DashboardStats {
  const { weekStart, weekEnd, monthStart, monthEnd } = currentRanges(now);
  const publishedDates = posts.filter((p) => p.status === "published" && p.published_at).map((p) => p.published_at as string);

  const overdue = posts
    .filter((p) => isOverdue(p, now))
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));

  const upcoming = posts
    .filter((p) => p.status === "scheduled" && p.scheduled_at && new Date(p.scheduled_at) >= now)
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""))
    .slice(0, 5);

  return {
    ideas: posts.filter((p) => p.status === "idea").length,
    drafts: posts.filter((p) => p.status === "draft").length,
    scheduledThisWeek: posts.filter((p) => p.status === "scheduled" && within(p.scheduled_at, weekStart, weekEnd)).length,
    publishedThisMonth: posts.filter((p) => p.status === "published" && within(p.published_at, monthStart, monthEnd)).length,
    streak: computeStreak(publishedDates, now),
    longestStreak: longestStreak(publishedDates),
    overdue,
    upcoming,
  };
}
