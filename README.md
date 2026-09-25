# Rahnamo

A career mentorship marketplace connecting students in Uzbekistan with counselors ("mentors"). Students book paid video consultations or open a running-tab text Q&A thread with a mentor; mentors apply for approval through an admin-reviewed application flow.

Live at [myrahnamo.com](https://myrahnamo.com).

## Features

- **Counselor catalog** (`/`) — browse and filter mentors by specialty.
- **Booking flow** (`/counselors/[id]`) — Standard/Premium video session tiers with manual payment confirmation (student sends proof, admin confirms — no live payment gateway yet).
- **Matnli maslahat (Text Q&A)** — a running-tab alternative to booked sessions: a student opens a free thread, each question adds to a live total billed at the mentor's own per-question rate, with an optional mentor-set question cap that pauses new questions until payment is confirmed. 18+ only, gated by a persisted self-attestation. Mentors reply through a passcode-gated inbox on their own profile page.
- **Become a counselor** (`/become-counselor`) — mentor application form, reviewed and approved/rejected from the admin panel.
- **Forum** (`/forum`) — public Q&A between students and counselors.
- **Admin panel** (`/admin`) — password-gated; manages bookings, applications, forum moderation, and Text Q&A threads (confirm payment, or manually flag an uncapped thread for payment as a safety valve).
- **Survey** (`/survey`) — standalone pricing/willingness-to-pay research page.
- Trilingual UI (Uzbek, Russian, English) via `next-intl`, cookie-based (no URL locale prefixes).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- TypeScript, Tailwind CSS 4
- [Supabase](https://supabase.com) (Postgres + RLS, Auth, used via `@supabase/supabase-js`)
- `next-intl` for i18n
- `react-three-fiber` / `three` for the landing page's 3D scene
- Playwright for end-to-end verification (see `scratch/` for ad hoc test scripts — not a committed test suite)

## Getting started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Create `.env.local` in the project root:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key — **server-only**, never exposed to the client. Used by a handful of API routes (mentor inbox, admin thread actions) that need to bypass RLS under controlled server-side checks. |
| `ADMIN_PASSWORD` | Shared passcode gating `/admin` |
| `COUNSELOR_PASSCODE` | Shared passcode gating the mentor-facing Text Q&A inbox and forum-answer routes |
| `SESSION_SECRET` | Signs the admin session cookie |
| `SITE_PASSWORD` | Legacy site-wide gate; currently unused (site is public) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Outbound email via [Resend](https://resend.com) |
| `NEXT_PUBLIC_TELEGRAM_BOT_TOKEN` / `NEXT_PUBLIC_TELEGRAM_CHAT_ID` | Telegram notifications for new bookings/applications |

### Database

Schema, RLS policies, and triggers live in [`supabase/schema.sql`](supabase/schema.sql) — run it against your Supabase project's SQL editor. The file is additive (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`), so it's safe to re-run.

Two RLS patterns are in use, deliberately:
- Most tables (`bookings`, `counselor_applications`, `forum_*`) use permissive `USING (true)` policies with client-side `device_id` scoping — a known, accepted tradeoff given there's no real user auth in this app.
- `question_threads` / `thread_messages` (Text Q&A) use real `auth.uid()`-based RLS backed by Supabase Anonymous Auth, since a student's thread privacy is a hard requirement. Pricing/payment-status columns are additionally protected by column-scoped `GRANT`s and `BEFORE INSERT/UPDATE` triggers so a client can't set its own price or flip its own payment status.

## Scripts

```bash
npm run dev     # start dev server (Turbopack)
npm run build   # production build
npm run start   # run a production build
npm run lint    # eslint
```

## Notes for AI coding agents

See [AGENTS.md](AGENTS.md) — this project pins a specific Next.js version with breaking changes from what most models were trained on; read the bundled docs before generating framework-level code.
