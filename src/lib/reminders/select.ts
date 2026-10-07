import { APP_TIMEZONE, DIGEST_HOUR, REMINDER_WINDOW_MINUTES } from "@/lib/config/reminders";
import { dayKeyInTz, hourInAppTz } from "@/lib/tz";

export type ReminderCandidate = {
  id: string;
  status: string;
  scheduled_at: string | null;
  reminded_at: string | null;
};

/**
 * Posts that need a reminder right now: scheduled, due within the window
 * (inclusive of now, exclusive of now+window), and not yet reminded.
 * Idempotent across repeated runs because reminded_at is set after sending.
 */
export function selectDueReminders<T extends ReminderCandidate>(
  posts: T[],
  now: Date = new Date(),
  windowMinutes: number = REMINDER_WINDOW_MINUTES,
): T[] {
  const start = now.getTime();
  const end = start + windowMinutes * 60_000;
  return posts
    .filter((p) => {
      if (p.status !== "scheduled" || !p.scheduled_at || p.reminded_at) return false;
      const t = new Date(p.scheduled_at).getTime();
      return t >= start && t < end;
    })
    .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? ""));
}

export type DigestSelection<T> = { today: T[]; overdue: T[] };

/** Posts scheduled for today (app timezone) and overdue scheduled posts. */
export function selectDigest<T extends ReminderCandidate>(
  posts: T[],
  now: Date = new Date(),
  tz: string = APP_TIMEZONE,
): DigestSelection<T> {
  const todayKey = dayKeyInTz(now, tz);
  const scheduled = posts.filter((p) => p.status === "scheduled" && p.scheduled_at);
  const byTime = (a: T, b: T) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "");
  return {
    today: scheduled.filter((p) => dayKeyInTz(p.scheduled_at as string, tz) === todayKey).sort(byTime),
    overdue: scheduled
      .filter((p) => new Date(p.scheduled_at as string).getTime() < now.getTime() && dayKeyInTz(p.scheduled_at as string, tz) !== todayKey)
      .sort(byTime),
  };
}

/**
 * The digest is sent on the first run at or after DIGEST_HOUR (app timezone)
 * on a day that has no digest_log row yet. `lastSentDay` is that row's day.
 */
export function shouldSendDigest(now: Date, alreadySentToday: boolean, digestHour: number = DIGEST_HOUR): boolean {
  if (alreadySentToday) return false;
  return hourInAppTz(now) >= digestHour;
}
