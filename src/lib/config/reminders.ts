/** Timezone used for all "calendar day" and digest decisions. */
export const APP_TIMEZONE = "Europe/Warsaw";

/** Hour (0-23) in APP_TIMEZONE at which the daily digest is sent. */
export const DIGEST_HOUR = 8;

/** Reminder lead window in minutes: posts scheduled within this window get a reminder. */
export const REMINDER_WINDOW_MINUTES = 60;

/** Default time of day for posts created from the calendar or "reschedule to tomorrow". */
export const DEFAULT_POST_HOUR = 9;
