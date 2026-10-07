import { formatInAppTz } from "@/lib/tz";
import { APP_TIMEZONE } from "@/lib/config/reminders";

export type EmailPost = {
  id: string;
  title: string;
  scheduled_at: string | null;
  post_items: { position: number; body: string }[];
};

export type RenderedEmail = { subject: string; html: string; text: string };

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function postLink(id: string): string {
  return `${siteUrl()}/posts/${id}`;
}

function displayTitle(post: EmailPost): string {
  if (post.title.trim()) return post.title.trim();
  const first = [...post.post_items].sort((a, b) => a.position - b.position)[0]?.body.trim() ?? "";
  return first ? (first.length > 60 ? first.slice(0, 60) + "…" : first) : "Untitled";
}

function when(post: EmailPost): string {
  return post.scheduled_at ? `${formatInAppTz(post.scheduled_at)} (${APP_TIMEZONE})` : "no time set";
}

const styles = {
  body: "font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111;max-width:600px;margin:0 auto;padding:24px",
  item: "white-space:pre-wrap;border:1px solid #e5e5e5;border-radius:8px;padding:12px;margin:8px 0;background:#fafafa",
  button:
    "display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600",
  muted: "color:#666;font-size:13px",
};

export function renderReminderEmail(post: EmailPost): RenderedEmail {
  const title = displayTitle(post);
  const items = [...post.post_items].sort((a, b) => a.position - b.position);
  const isThread = items.length > 1;
  const link = postLink(post.id);

  const html = `<!doctype html><html><body style="${styles.body}">
<p style="${styles.muted}">Linkit reminder</p>
<h1 style="font-size:20px;margin:0 0 4px">${escapeHtml(title)}</h1>
<p style="margin:0 0 16px">Scheduled for <strong>${escapeHtml(when(post))}</strong></p>
${items
  .map(
    (it, i) =>
      `<div style="${styles.item}">${isThread ? `<span style="${styles.muted}">${i + 1}/</span> ` : ""}${escapeHtml(it.body)}</div>`,
  )
  .join("")}
<p style="margin:20px 0"><a href="${link}" style="${styles.button}">Open in Linkit</a></p>
<p style="${styles.muted}">Copy the text, post it on X, then paste the published URL back into Linkit.</p>
</body></html>`;

  const text = [
    `Linkit reminder: ${title}`,
    `Scheduled for ${when(post)}`,
    "",
    ...items.map((it, i) => (isThread ? `${i + 1}/ ${it.body}` : it.body)),
    "",
    `Open: ${link}`,
  ].join("\n");

  return { subject: `Post in <1h: ${title}`, html, text };
}

export function renderDigestEmail(today: EmailPost[], overdue: EmailPost[], now: Date = new Date()): RenderedEmail {
  const dateLabel = formatInAppTz(now, "EEEE, d MMMM yyyy");
  const list = (posts: EmailPost[], empty: string) =>
    posts.length === 0
      ? `<p style="${styles.muted}">${empty}</p>`
      : `<ul style="padding-left:18px;margin:4px 0 12px">${posts
          .map(
            (p) =>
              `<li style="margin:4px 0"><a href="${postLink(p.id)}" style="color:#111">${escapeHtml(displayTitle(p))}</a> <span style="${styles.muted}">— ${escapeHtml(
                p.scheduled_at ? formatInAppTz(p.scheduled_at, "HH:mm, d MMM") : "",
              )}</span></li>`,
          )
          .join("")}</ul>`;

  const html = `<!doctype html><html><body style="${styles.body}">
<p style="${styles.muted}">Linkit daily digest · ${escapeHtml(dateLabel)}</p>
<h2 style="font-size:17px;margin:12px 0 4px">Today (${today.length})</h2>
${list(today, "Nothing scheduled for today.")}
<h2 style="font-size:17px;margin:12px 0 4px">Overdue (${overdue.length})</h2>
${list(overdue, "Nothing overdue.")}
<p style="margin:20px 0"><a href="${siteUrl()}/board" style="${styles.button}">Open board</a></p>
</body></html>`;

  const line = (p: EmailPost) =>
    `- ${displayTitle(p)} — ${p.scheduled_at ? formatInAppTz(p.scheduled_at, "HH:mm, d MMM") : ""} ${postLink(p.id)}`;
  const text = [
    `Linkit daily digest · ${dateLabel}`,
    "",
    `Today (${today.length})`,
    ...(today.length ? today.map(line) : ["Nothing scheduled for today."]),
    "",
    `Overdue (${overdue.length})`,
    ...(overdue.length ? overdue.map(line) : ["Nothing overdue."]),
    "",
    `Board: ${siteUrl()}/board`,
  ].join("\n");

  const subject =
    today.length === 0 && overdue.length === 0
      ? `Linkit: nothing due today`
      : `Linkit: ${today.length} today${overdue.length ? `, ${overdue.length} overdue` : ""}`;

  return { subject, html, text };
}
