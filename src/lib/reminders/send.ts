import { Resend } from "resend";
import type { RenderedEmail } from "@/lib/reminders/email";

const DEFAULT_FROM = "Linkit <onboarding@resend.dev>";

export async function sendEmail(email: RenderedEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.REMINDER_TO_EMAIL;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  if (!to) throw new Error("REMINDER_TO_EMAIL is not set");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.REMINDER_FROM_EMAIL || DEFAULT_FROM,
    to,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}
