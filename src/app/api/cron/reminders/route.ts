import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderDigestEmail, renderReminderEmail } from "@/lib/reminders/email";
import { selectDigest, selectDueReminders, shouldSendDigest } from "@/lib/reminders/select";
import { sendEmail } from "@/lib/reminders/send";
import { dayKeyInTz } from "@/lib/tz";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Hourly (or daily, on the Vercel Hobby plan) cron:
 *  1. one reminder email per scheduled post due within the next 60 minutes
 *     that has not been reminded yet (reminded_at is claimed before sending);
 *  2. the daily digest, once per Europe/Warsaw day at/after DIGEST_HOUR,
 *     recorded in digest_log.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const now = new Date();
  const supabase = createAdminClient();
  const result = { reminders: [] as string[], digest: false as boolean | string, errors: [] as string[] };

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, title, status, scheduled_at, reminded_at, post_items(position, body)")
    .eq("status", "scheduled")
    .not("scheduled_at", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 1. Reminders
  for (const post of selectDueReminders(posts ?? [], now)) {
    // Claim first so a concurrent run cannot send the same reminder twice.
    const { data: claimed } = await supabase
      .from("posts")
      .update({ reminded_at: now.toISOString() })
      .eq("id", post.id)
      .is("reminded_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    try {
      await sendEmail(renderReminderEmail(post));
      result.reminders.push(post.id);
    } catch (e) {
      // Release the claim so the next run retries.
      await supabase.from("posts").update({ reminded_at: null }).eq("id", post.id);
      result.errors.push(`reminder ${post.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 2. Daily digest
  const todayKey = dayKeyInTz(now);
  const { data: logRow } = await supabase.from("digest_log").select("day").eq("day", todayKey).maybeSingle();
  if (shouldSendDigest(now, !!logRow)) {
    // Insert first: the primary key makes a second run a no-op.
    const { error: insErr } = await supabase.from("digest_log").insert({ day: todayKey });
    if (!insErr) {
      try {
        const { today, overdue } = selectDigest(posts ?? [], now);
        await sendEmail(renderDigestEmail(today, overdue, now));
        result.digest = true;
      } catch (e) {
        await supabase.from("digest_log").delete().eq("day", todayKey);
        result.digest = false;
        result.errors.push(`digest: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      result.digest = "already-sent";
    }
  }

  return NextResponse.json({ ok: result.errors.length === 0, at: now.toISOString(), ...result }, { status: result.errors.length ? 500 : 200 });
}
