# Linkit

Personal content-planning and tracking app for X (Twitter) posts. It replaces a spreadsheet: write and draft posts, schedule when you intend to publish, get reminded, post manually on X, then paste the published URL back so you always know what is published, scheduled, or still an idea.

Linkit never posts to X on your behalf and never talks to the X API.

## Stack

Next.js 15 (App Router, Server Actions, TypeScript), Tailwind CSS v4, shadcn/ui, Supabase (Postgres, Auth, Storage) via `@supabase/ssr`, Resend for email, Vercel for hosting and cron. Package manager: pnpm. Dates: `date-fns` + `date-fns-tz`. Character counting: `twitter-text`. Drag and drop: `@dnd-kit`.

All timestamps are stored in UTC. The UI displays them in the browser's timezone. Emails, the daily digest, the streak and "this week/month" use `Europe/Warsaw` (see `src/lib/config/reminders.ts`).

## Features

- **Editor** (`/posts/new`, `/posts/[id]`): per-item textarea with a live weighted character counter (URLs count as 23, emoji/CJK as 2), thread mode with add/remove/reorder, X-style preview, up to 4 images per item, pillar select with inline create, notes, schedule picker, status. Autosaves 1.5 s after the last keystroke. Copy per item and "Copy all" for threads. "Mark as published" asks for the x.com URL.
- **Board** (`/board`, landing page after login): kanban Idea → Draft → Scheduled → Published with drag and drop. Dropping into Scheduled without a date asks for one; into Published asks for the URL; leaving Published asks for confirmation. Cancelled posts sit behind a toggle.
- **Calendar** (`/calendar`): month and week views. Click a day to create a post at 09:00; drag a post to another day to reschedule with the time preserved. Pillar and status filters live in the URL.
- **List** (`/posts`): sortable table, search across title, notes and item bodies, CSV export of the current filter.
- **Dashboard** (`/`): ideas, drafts, scheduled this week, published this month; overdue list with "Mark published" and "Reschedule to tomorrow 09:00"; publishing streak.
- **Reminders**: email before a scheduled post and a daily digest of today's and overdue posts.
- **Pillars** (`/pillars`): content categories with colours.

## Environment variables

| Variable | Where used | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | server + browser | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | server + browser | Supabase anon (publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` | cron route, e2e tests, `rls-check` only | Bypasses RLS. Never expose to the browser. |
| `RESEND_API_KEY` | cron route | Resend API key |
| `REMINDER_TO_EMAIL` | cron route | Recipient of reminders and the daily digest |
| `REMINDER_FROM_EMAIL` | cron route | Optional verified sender. Defaults to `Linkit <onboarding@resend.dev>`, which Resend only delivers to the email of your own Resend account. |
| `CRON_SECRET` | cron route | Random string. Vercel sends it as `Authorization: Bearer <CRON_SECRET>`. |
| `NEXT_PUBLIC_SITE_URL` | emails | Public URL used in email deep links |

Copy `.env.example` to `.env.local` and fill it in.

## Local setup

Prerequisites: Node 22, pnpm 10, Docker (Docker Desktop or OrbStack), Supabase CLI.

```bash
pnpm install
supabase start
```

`supabase start` boots Postgres, Auth, Storage and a local mail catcher, and applies everything in `supabase/migrations/`. It prints the API URL, anon key and service role key. Put those three into `.env.local`, then:

```bash
pnpm dev
```

Open <http://localhost:3000>. Magic-link emails for local development land in the mail catcher at <http://127.0.0.1:54324>.

Useful commands:

| Command | Purpose |
| --- | --- |
| `supabase db reset` | Drop and recreate the local DB from the migrations |
| `supabase migration new <name>` | Create a new migration file |
| `supabase db push` | Apply migrations to a linked hosted project |
| `pnpm db:types` | Regenerate `src/lib/database.types.ts` from the local DB |

### Running the migrations on a hosted project

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## Creating your single account

Sign-ups are disabled so nobody else can create an account. Create yours by hand:

1. Supabase Dashboard → **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign up". Keep "Enable email provider" on.
2. **Authentication → Users → Add user → Create new user**: enter your email, tick **Auto Confirm User**, create.
3. **Authentication → URL Configuration**: set *Site URL* to your deployed URL and add `https://<your-domain>/auth/callback` and `http://localhost:3000/auth/callback` to *Redirect URLs*.
4. Open the app, enter that email, click the magic link.

The login form also passes `shouldCreateUser: false`, so even if the dashboard setting is flipped the app will not create accounts.

For the local stack, `supabase/config.toml` keeps sign-ups enabled so tests can create throwaway users; the same "Add user" flow is available in Studio at <http://127.0.0.1:54323>.

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel (framework preset: Next.js, install command `pnpm install`).
2. Add every variable from the table above in **Settings → Environment Variables**. Generate `CRON_SECRET` with `openssl rand -hex 32`.
3. Deploy. `vercel.json` registers the cron jobs automatically.
4. In Resend, create an API key. With the free tier and no verified domain you can only send to the email address of your Resend account, so set `REMINDER_TO_EMAIL` to that address, or verify a domain and set `REMINDER_FROM_EMAIL`.

### Cron schedule and plan limits

`vercel.json` currently registers **two daily runs** of `/api/cron/reminders`, at 06:00 and 07:00 UTC. The Vercel Hobby plan only allows daily crons, and this pair makes the digest land at 08:00 Europe/Warsaw in both winter (CET) and summer (CEST); `digest_log` guarantees it is sent once. On the Hobby plan the 60-minute reminders therefore only fire for posts scheduled in the hour after one of those runs.

To get real hourly reminders, upgrade to Vercel Pro and replace the crons with:

```json
{ "crons": [{ "path": "/api/cron/reminders", "schedule": "0 * * * *" }] }
```

Nothing else changes: the route already handles both reminders and the digest on every run. Note that with an hourly cron a post scheduled at 10:05 is reminded at the 10:00 run, so lead time varies between 0 and 60 minutes.

The digest hour is `DIGEST_HOUR` in `src/lib/config/reminders.ts`.

## Scripts and tests

| Command | Purpose |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests: character counting (URLs, emoji, CJK), timezone day bucketing (23:30 Warsaw), streak, reminder selection |
| `pnpm test:e2e` | Playwright core loop. Needs the dev server (started automatically) and `.env.local` with the service role key. Logs in by generating a magic link through the admin API. |
| `pnpm rls-check` | Creates two throwaway users and verifies the second cannot read, update, delete or attach items to the first user's post, nor list their media folder. |

## Design notes

- **Search** uses `ilike` through the `search_posts()` SQL function instead of `tsvector`, because item bodies live in a separate table and the data set is one person's posts.
- **Status invariants** are enforced both by CHECK constraints (`scheduled` needs `scheduled_at`, `published` needs `published_url` and `published_at`) and by Server Actions. Empty or over-length items only block the *transition into* `scheduled`/`published`, so autosave of an already scheduled post never fails.
- **`kind`** is derived from the number of items: more than one item makes a thread.
- **Rescheduling clears `reminded_at`**, so a moved post gets a fresh reminder.
- **Deleting a post** removes its Storage objects in the Server Action before deleting the row; removing an image in the editor deletes the object immediately, and saving sweeps any orphaned paths.
- **Streak** counts back from today, or from yesterday when nothing has been published yet today.
- **Post ids are generated in the browser** so `/posts/new` can autosave and become `/posts/<id>` without a round trip. An empty new post is never saved.

## Non-goals

No posting via the X API, no X OAuth, no automatic metrics, no multi-user, no AI writing help, no rich text. Table names are platform-neutral so a `platform` column can be added later.
