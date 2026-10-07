# Linkit

Personal content-planning and tracking app for X (Twitter) posts. Replaces a spreadsheet: write and draft posts, schedule when to publish, get reminded, post manually on X, then paste the published URL back.

Linkit never posts to X on your behalf.

## Stack

Next.js 15 (App Router, Server Actions), TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres, Auth, Storage), Resend for email, deployed on Vercel. Package manager: pnpm.

## Environment variables

| Variable | Where used | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | server + browser | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | server + browser | Supabase anon (publishable) key |
| `SUPABASE_SERVICE_ROLE_KEY` | cron route and scripts only | Bypasses RLS. Never expose to the browser. |
| `RESEND_API_KEY` | cron route | Resend API key for reminder emails |
| `REMINDER_TO_EMAIL` | cron route | Recipient of reminders and the daily digest |
| `REMINDER_FROM_EMAIL` | cron route | Optional verified sender; defaults to `onboarding@resend.dev` |
| `CRON_SECRET` | cron route | Random secret; Vercel sends it as `Authorization: Bearer …` |
| `NEXT_PUBLIC_SITE_URL` | emails | Public URL used for deep links in emails |

Copy `.env.example` to `.env.local` and fill in the values.

## Local setup

_TODO: filled in during phase 7._

## Creating your single account

_TODO._

## Deploying to Vercel

_TODO._

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the dev server |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm rls-check` | Verifies Row Level Security with a second test user |
