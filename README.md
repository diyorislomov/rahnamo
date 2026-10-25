# Rahnamo

A career mentorship marketplace connecting students in Uzbekistan with counselors ("mentors"). Students book paid video consultations or open a running-tab text Q&A thread with a mentor; mentors apply for approval through an admin-reviewed application flow.

Live at [myrahnamo.com](https://myrahnamo.com).

## Features

- **Counselor catalog** (`/`) — browse and filter mentors by specialty.
- **Guided mentor matching** (`/match`) — recommends mentors from the student's field, goal, preferred format and budget.
- **Goal-based early access** — captures each user's career goal, level and field before mentor supply is available, and surfaces that demand in the admin dashboard.
- **Booking flow** (`/counselors/[id]`) — live availability, collision-safe slot booking, rescheduling/cancellation for unpaid bookings, and signed Click Business checkout confirmation.
- **Mentor services** — mentors can publish priced services such as quick calls, CV reviews, mock interviews, grant guidance and monthly mentorship from their dashboard.
- **Mentee accounts** — registration and sign-in through Google or Telegram, with accounts and sessions stored in server-local PostgreSQL.
- **Matnli maslahat (Text Q&A)** — a running-tab alternative to booked sessions: each question adds to a live total billed at the mentor's own per-question rate, with an optional cap that pauses new questions until payment is confirmed.
- **Become a counselor** (`/become-counselor`) — mentor application form, reviewed and approved/rejected from the admin panel.
- **Forum** (`/forum`) — public Q&A between students and counselors.
- **Admin panel** (`/admin`) — password-gated; manages bookings, applications, goal demand, marketplace metrics, forum moderation, and Text Q&A threads.
- **Survey** (`/survey`) — standalone pricing/willingness-to-pay research page.
- Trilingual UI (Uzbek, Russian, English) via `next-intl`, cookie-based (no URL locale prefixes).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- TypeScript, Tailwind CSS 4
- Auth.js with Google and Telegram OIDC providers
- Local PostgreSQL for all application data: accounts, mentor sessions, catalog, applications, profiles, bookings, payments, forum, tracks and surveys
- `next-intl` for i18n
- Playwright for browser verification

## Getting started

Install dependencies and run the dev server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

Copy `.env.example` to `.env.local` and replace every placeholder:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical public origin used by metadata, robots and sitemap |
| `ADMIN_PASSWORD` | Shared passcode gating `/admin` |
| `SESSION_SECRET` | Signs admin/site session cookies; use at least 32 random characters |
| `SITE_PASSWORD` | Legacy site-wide gate; currently unused (site is public) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Outbound email via [Resend](https://resend.com) |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Server-only Telegram notifications for bookings/applications |
| `NEXT_PUBLIC_PAYMENT_CARD_NUMBER` / `NEXT_PUBLIC_PAYMENT_CARD_OWNER` | Public manual-payment details shown to customers |
| `UPLOAD_DIR` | Persistent local upload directory |
| `DATABASE_URL` | Server-local PostgreSQL connection string |
| `AUTH_SECRET` | Auth.js session secret; use at least 32 random characters |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth web client credentials |
| `AUTH_TELEGRAM_ID` / `AUTH_TELEGRAM_SECRET` | Telegram Login OIDC credentials from BotFather |
| `CLICK_SERVICE_ID` / `CLICK_MERCHANT_ID` | Click Business service and merchant identifiers |
| `CLICK_MERCHANT_USER_ID` / `CLICK_SECRET_KEY` | Server-only Click Merchant API credentials |

### Database

Apply the local PostgreSQL schema before starting the app:

```bash
npm run db:migrate
```

Configure these OAuth callback URLs:

- `https://myrahnamo.com/api/auth/callback/google`
- `https://myrahnamo.com/api/auth/callback/telegram`

Configure these Click Business SHOP API URLs:

- Prepare: `https://myrahnamo.com/api/payments/click/prepare`
- Complete: `https://myrahnamo.com/api/payments/click/complete`

In BotFather, add `https://myrahnamo.com` as an allowed Login Widget/OIDC URL.

Migrations in `database/migrations/` run once inside a transaction and record their checksums. Existing user and payment data is preserved. Run `node --env-file=.env.local scripts/migrate.mjs` locally, or use the server's `.env.production.local` file.

Set `UPLOAD_DIR` to persistent storage outside release directories (production: `/var/lib/rahnamo/uploads`). JPEG, PNG and WebP uploads are validated, limited to 5 MB and served by `/api/uploads/`. Back up this directory together with PostgreSQL.

Admin approval creates a mentor account and a single-use activation link valid for 48 hours. The admin shares this link with the mentor. Mentor passwords use scrypt; sessions are opaque HTTP-only cookies, stored hashed in PostgreSQL. Mentees continue using Google/Telegram through Auth.js.

## Scripts

```bash
npm run dev     # start dev server (Turbopack)
npm run build   # production build
npm run db:migrate # apply the local PostgreSQL schema
npm run start   # run a production build
npm run lint    # eslint
npm test        # unit tests
```

## Notes for AI coding agents

See [AGENTS.md](AGENTS.md) — this project pins a specific Next.js version with breaking changes from what most models were trained on; read the bundled docs before generating framework-level code.

## Continuous integration and deployment

Pull requests run deployment tests, application tests and a production build.
Passing pushes to `main` automatically deploy to `myrahnamo.com`, with a staged
server build, health checks and automatic rollback. See [the CI/CD runbook](ops/README.md)
for configuration, controller maintenance and recovery instructions.
