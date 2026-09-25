# Rahnamo

A multilingual mentor discovery, consultation and community platform built with Next.js, React, next-intl and Supabase. Uzbek, Russian and English interfaces share responsive layouts, accessible form labels, visible failure/retry states and explicit demo behavior.

## Local development

```sh
npm ci
cp .env.example .env.local
npm run dev
```

With both Supabase public values empty, the catalog and video-booking preview use clearly labeled sample data. Preview bookings stay in separate browser storage; no payment, email, application, survey or public forum submission is sent. Text consultation requires a configured backend.

For real data, fill `.env.local`, enable Supabase **anonymous sign-ins**, and apply the database setup below. Anonymous authentication identifies the student's current browser; clearing its storage or switching devices loses access. This version does not provide account recovery or cross-device login. Administrators must verify ownership independently before helping recover historical records.

## Database setup and upgrade

- **Fresh database:** run `supabase/schema.sql` in the Supabase SQL editor as the database owner. It requires Supabase's `auth` schema and `anon`, `authenticated`, `service_role` roles. It contains no sample mentors or fabricated reviews.
- **Existing Rahnamo database:** back up first, then run `supabase/migrations/20260925_platform_integrity.sql`. Deploy this server and UI together with that migration. Both scripts can be applied repeatedly.
- Existing booking rows without `student_auth_id` remain administrator-only. The migration deliberately does not claim ownership using the old spoofable `device_id`.
- Historical malformed prices are preserved for reconciliation; new writes must satisfy positive-price checks. Existing sample profiles, ratings and availability should be reviewed by the operator before publication.
- Approved mentors start with no invented appointment slots or portrait. Populate their actual `available_slots`, profile and individual credential before accepting consultations.

Public access is limited to counselors, reviews, forum answers and an explicit forum-question view that excludes email. Students can read only their owned bookings/messages and submit a payment reference for their awaiting-payment thread. Question billing is written through a locked, idempotent function. Administrator transitions, mentor replies, applications, surveys and bookings use server routes with the service-role credential.

## Server configuration

The complete variable list is in `.env.example`. `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `ADMIN_PASSWORD`, `COUNSELOR_PASSCODES`, payment destination and notification credentials are **server-only**. Never prefix those secrets with `NEXT_PUBLIC_`. Remove and rotate any previously deployed public Telegram token. This repository change cannot revoke an exposed credential for you.

`COUNSELOR_PASSCODES` is a JSON mapping from counselor ID to a different random credential of at least 12 characters. A mentor credential grants access only to that mentor's inbox and forum replies. Rotate by changing the mapping. Administrator cookies are HTTP-only, expire after 12 hours and are signed with an administrator-specific purpose. Old generic site-gate tokens are rejected, and the site gate is retired.

API abuse limits are persisted in PostgreSQL and survive server restarts. Deploy behind a trusted proxy that sets/overwrites `x-real-ip` or `x-forwarded-for`; do not expose a setup where clients can forge the trusted IP header. Supabase Auth should also have suitable anonymous-sign-in abuse protection enabled.

## Booking and payment behavior

Video booking is a three-step **request**: choose a package/time, enter details, then review. Displayed recurring availability is a requested time; a mentor must confirm the calendar date and timing. This version does not reserve dated inventory or prevent two requests for the same recurring window.

The server derives price from the counselor and saves the booking before notifications. Transfer instructions appear after persistence. A payment reference is not proof of payment: an administrator reconciles it and explicitly confirms. A private, unpredictable meeting link is created only on confirmation. This is a manual bank-transfer workflow; Payme/Click/Uzum select the transfer app, not a payment-gateway integration. The configured destination must be verified before launch.

Text Q&A snapshots the mentor's price/cap, creates the booking and thread in one transaction, and locks the thread while accepting each billed question. Retrying the same request does not bill twice. Once capped or flagged, new questions stop. Administrators confirm settlement; mentors can still answer accepted questions after settlement. Fulfillment completion is separate, and only the owner of a paid, completed consultation can leave one review.

Email and Telegram notifications happen after save. Delivery failures display a warning and never roll back or pretend to undo a saved booking. Email retries use a provider idempotency key; there is currently no background notification outbox/retry worker. Use the admin dashboard as the record of truth.

## Validation

```sh
npm run lint
npm run typecheck
npm test
npm run build -- --webpack
```

The database suite uses isolated PGlite PostgreSQL, including fresh/repeated installation and upgrade from the original schema. It exercises grants, RLS, transaction behavior, idempotency and payment/review rules. PGlite does not reproduce separate concurrent PostgreSQL backend sessions; real staging load/concurrency testing remains part of deployment acceptance.

Browser tests use installed Google Chrome through Playwright and synthetic data. To reproduce the live UI tests without contacting a Supabase project, build/start with a local dummy public URL:

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54329 NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key npm run build -- --webpack
npm run start -- --hostname 127.0.0.1 --port 3217
# In another terminal:
npm run test:browser
```

The suites mock data and writes and cover all seven pages at 320, 390, 768 and 1440 pixel widths in all three languages, booking/retry/receipt/history, closed Q&A, applications, survey, forum and admin action failures. Evidence is written under ignored `artifacts/qa/`. A mock browser pass does not verify live Supabase configuration, provider delivery, bank transfers or meeting operation.

Before production, apply the migration to staging, configure real credentials and transfer details, enable anonymous Auth, test real owned records and administrator/mentor access with test accounts, and verify a test notification. No production migration or deployment is performed by these local scripts.

For demo-only checks, rebuild with both public Supabase variables empty, restart the preview, then run `npm run test:demo`.
