/**
 * Seeds a local account and demo posts so the UI has something to show.
 *   pnpm tsx scripts/seed-demo.ts [email]
 * Local/dev only: needs SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */
import { config as loadEnv } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { addDays, addHours, setHours, setMinutes, startOfDay } from "date-fns";

loadEnv({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2] ?? process.env.REMINDER_TO_EMAIL;
if (!url || !service || !email) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and an email (arg or REMINDER_TO_EMAIL).");
  process.exit(2);
}
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error("Refusing to seed a non-local Supabase URL:", url);
  process.exit(2);
}

const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email?.toLowerCase() === email!.toLowerCase());
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email: email!, email_confirm: true });
    if (error || !data.user) throw new Error(error?.message);
    user = data.user;
    console.log("Created user", email);
  } else {
    console.log("User exists", email);
  }
  const uid = user.id;

  const { count } = await admin.from("posts").select("id", { count: "exact", head: true }).eq("user_id", uid);
  if ((count ?? 0) > 0) {
    console.log(`User already has ${count} posts; not seeding again.`);
    return;
  }

  const { data: pillars, error: pErr } = await admin
    .from("pillars")
    .upsert(
      [
        { user_id: uid, name: "Build in public", color: "#3b82f6" },
        { user_id: uid, name: "Product thinking", color: "#10b981" },
        { user_id: uid, name: "Personal", color: "#f59e0b" },
      ],
      { onConflict: "user_id,name" },
    )
    .select();
  if (pErr) throw new Error(pErr.message);
  const pillar = (name: string) => pillars!.find((p) => p.name === name)!.id;

  const now = new Date();
  const at = (dayOffset: number, hour: number, minute = 0) =>
    setMinutes(setHours(startOfDay(addDays(now, dayOffset)), hour), minute).toISOString();

  type Seed = {
    title: string;
    status: "idea" | "draft" | "scheduled" | "published" | "cancelled";
    pillar?: string;
    scheduled_at?: string;
    published_at?: string;
    published_url?: string;
    notes?: string;
    items: string[];
    metrics?: { impressions: number; likes: number; reposts: number; replies: number; bookmarks: number };
  };

  const seeds: Seed[] = [
    {
      title: "Why I replaced my content spreadsheet",
      status: "published",
      pillar: "Build in public",
      scheduled_at: at(-6, 9),
      published_at: at(-6, 9, 12),
      published_url: "https://x.com/linkit/status/1843001000000000001",
      items: [
        "I tracked 200+ posts in a spreadsheet for a year. It broke in exactly three ways 🧵",
        "1/ No idea what was actually published vs. just planned. Columns drifted, dates lied.",
        "2/ Threads were a nightmare: one cell per tweet, no preview, no character count.",
        "3/ Zero reminders. I'd remember at 11pm that today's post was due at 9am.\n\nSo I built a tiny app for exactly this loop: idea → draft → schedule → post by hand → paste the link back.",
      ],
      metrics: { impressions: 18400, likes: 212, reposts: 31, replies: 19, bookmarks: 87 },
    },
    {
      title: "Shipping log, week 40",
      status: "published",
      pillar: "Build in public",
      scheduled_at: at(-3, 10),
      published_at: at(-3, 10, 5),
      published_url: "https://x.com/linkit/status/1843001000000000002",
      items: ["Shipped this week:\n\n• Kanban board with drag and drop\n• Calendar view\n• Email reminders\n\nNext: metrics and a streak counter."],
      metrics: { impressions: 6200, likes: 74, reposts: 8, replies: 11, bookmarks: 23 },
    },
    {
      title: "Yesterday's post (published)",
      status: "published",
      pillar: "Personal",
      scheduled_at: at(-1, 8, 30),
      published_at: at(-1, 8, 41),
      published_url: "https://x.com/linkit/status/1843001000000000003",
      items: ["Consistency beats intensity. One post a day, every day, for 30 days. Day 12."],
    },
    {
      title: "Overdue: the 280 rule",
      status: "scheduled",
      pillar: "Product thinking",
      scheduled_at: at(-1, 17),
      items: ["X counts URLs as 23 characters no matter how long they are. Emoji count as 2. Most people don't know this and get cut off mid-sentence."],
    },
    {
      title: "Today 18:00 — launch teaser",
      status: "scheduled",
      pillar: "Build in public",
      scheduled_at: addHours(now, 3).toISOString(),
      items: ["Something small ships tomorrow. It replaces a spreadsheet, sends you a nudge an hour before you post, and never posts for you. 👀"],
    },
    {
      title: "Thread: how reminders work",
      status: "scheduled",
      pillar: "Product thinking",
      scheduled_at: at(1, 9),
      notes: "Link to the cron docs; mention Hobby plan limits.",
      items: [
        "How a one-person app sends you reminders without a server you babysit 🧵",
        "1/ A cron hits one route. The route asks: which posts are due in the next 60 minutes and haven't been reminded yet?",
        "2/ Each match is claimed first (reminded_at = now) and emailed second. Two overlapping runs can't double-send.",
        "3/ The daily digest is the same idea with a one-row table keyed by the calendar day. Boring, but it never fires twice.",
      ],
    },
    {
      title: "Weekend reflection",
      status: "scheduled",
      pillar: "Personal",
      scheduled_at: at(3, 11),
      items: ["What I'd tell myself a year ago about building in public: nobody is watching yet, and that's the best time to be bad at it."],
    },
    {
      title: "Draft: pricing thoughts",
      status: "draft",
      pillar: "Product thinking",
      items: ["Free tiers are a marketing expense, not a product tier. Treat the budget like one.", ""],
    },
    {
      title: "Draft: the preview trap",
      status: "draft",
      pillar: "Build in public",
      items: ["Pixel-perfect previews are a trap for v1. Roughly-right previews with a correct character count are what actually prevent mistakes."],
    },
    { title: "Idea: calendar heatmap", status: "idea", pillar: "Build in public", items: [""] },
    { title: "Idea: what a streak really measures", status: "idea", pillar: "Personal", items: ["Streaks measure showing up, not quality. That's the point."] },
    { title: "Idea: interview a creator who posts daily", status: "idea", items: [""] },
    {
      title: "Cancelled: hot take",
      status: "cancelled",
      pillar: "Personal",
      scheduled_at: at(-2, 12),
      items: ["Deleted this one before it went out. Not every take needs to ship."],
    },
  ];

  for (const s of seeds) {
    const { data: post, error } = await admin
      .from("posts")
      .insert({
        user_id: uid,
        title: s.title,
        status: s.status,
        kind: s.items.length > 1 ? "thread" : "single",
        scheduled_at: s.scheduled_at ?? null,
        published_at: s.published_at ?? null,
        published_url: s.published_url ?? null,
        pillar_id: s.pillar ? pillar(s.pillar) : null,
        notes: s.notes ?? null,
      })
      .select("id")
      .single();
    if (error || !post) throw new Error(`${s.title}: ${error?.message}`);
    const { error: iErr } = await admin
      .from("post_items")
      .insert(s.items.map((body, position) => ({ post_id: post.id, position, body })));
    if (iErr) throw new Error(iErr.message);
    if (s.metrics) {
      const { error: mErr } = await admin.from("post_metrics").insert({ post_id: post.id, ...s.metrics });
      if (mErr) throw new Error(mErr.message);
    }
  }
  console.log(`Seeded ${seeds.length} posts and ${pillars!.length} pillars for ${email}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
