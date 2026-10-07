import { addDays, format, parse, startOfDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { APP_TIMEZONE, DEFAULT_POST_HOUR } from "@/lib/config/reminders";

const INPUT_FORMAT = "yyyy-MM-dd'T'HH:mm";

/** ISO (UTC) -> value for <input type="datetime-local"> in the browser's zone. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  return format(new Date(iso), INPUT_FORMAT);
}

/** <input type="datetime-local"> value (browser zone) -> ISO UTC string, or null when empty. */
export function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = parse(value, INPUT_FORMAT, new Date());
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** "yyyy-MM-dd" for the calendar day an instant falls on in the given zone. */
export function dayKeyInTz(iso: string | Date, tz: string = APP_TIMEZONE): string {
  return formatInTimeZone(iso, tz, "yyyy-MM-dd");
}

/** Formats an instant in the app timezone, e.g. for emails. */
export function formatInAppTz(iso: string | Date, pattern = "EEE, d MMM yyyy HH:mm"): string {
  return formatInTimeZone(iso, APP_TIMEZONE, pattern);
}

/** Hour of day (0-23) of an instant in the app timezone. */
export function hourInAppTz(instant: Date = new Date()): number {
  return Number(formatInTimeZone(instant, APP_TIMEZONE, "H"));
}

/**
 * Instant for `dayKey` (yyyy-MM-dd) at `hour`:00 in the given zone.
 * Used for "create post on this day at 09:00" and "reschedule to tomorrow 09:00".
 */
export function dayKeyAtHour(dayKey: string, hour: number = DEFAULT_POST_HOUR, tz: string = APP_TIMEZONE): Date {
  return fromZonedTime(`${dayKey}T${String(hour).padStart(2, "0")}:00:00`, tz);
}

/** Tomorrow at DEFAULT_POST_HOUR in the app timezone. */
export function tomorrowAtDefaultHour(now: Date = new Date()): Date {
  const zonedNow = toZonedTime(now, APP_TIMEZONE);
  const tomorrowKey = format(addDays(startOfDay(zonedNow), 1), "yyyy-MM-dd");
  return dayKeyAtHour(tomorrowKey);
}

/**
 * Replaces the calendar day of an instant while keeping its wall-clock time in `tz`.
 * Used by calendar drag-to-reschedule.
 */
export function moveToDay(iso: string, dayKey: string, tz: string = APP_TIMEZONE): Date {
  const time = formatInTimeZone(iso, tz, "HH:mm:ss");
  return fromZonedTime(`${dayKey}T${time}`, tz);
}
