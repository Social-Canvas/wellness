# Production Readiness Audit — Elevate Health Solutions Yoga Platform

Audit date: 2026-07-12 · Scope: read-only codebase + config review (no secret values captured)

## Launch Blockers (P0)

1. **Stand-in Mux clip can leak into production.** `scripts/welcome-mux-e2e.mjs` uploads a public Google-hosted demo video (`https://storage.googleapis.com/muxdemofiles/mux-video-intro.mp4`) as the "Welcome" lesson asset, then **publishes the video, lesson, module, AND the entire course** (`courses.status = 'published'`) for E2E testing. If this script is ever run against the production Supabase project / Mux environment without the matching `--revert-course` step, real subscribers will see stock demo footage under "The 7-Day Elevated Reset," and the whole course (not just Welcome) will be exposed while 21 of 22 lessons are still draft placeholders with no video.
2. **No path exists to create the first `super_admin`.** `updateMemberRole` requires the *actor* to already be `super_admin` (`requireSuperAdminActor`), and new signups always get `role: 'user'` (both in the `handle_new_user` trigger and in `repairMissingProfile`). There is no seed row, migration, or bootstrap script that grants `super_admin` to anyone. Until a manual DB update is performed in the production Supabase project, `/admin` is unreachable by any account and no one can promote members.
3. **Resend, GHL, and Cron job processing are not implemented**, despite being required launch criteria (TASKS.md Sprint 15/16) and required env vars (`env.ts` fails build/boot without `RESEND_API_KEY`, `GHL_API_KEY`, `CRON_SECRET` in production). No code imports `resend`, no GHL client exists under `src/`, and there is no `/api/cron/*` route. Concretely: no confirmation/cancellation/purchase/certificate emails will send, no lead sync to GHL, and `integration_jobs` (if used anywhere) has no processor.
4. **No `middleware.ts` in the project.** Supabase SSR session refresh and the `architecture`/`nextjs` rules both call for middleware-based session refresh; this repo relies entirely on per-layout `supabase.auth.getUser()` checks in `(dashboard)` and `(admin)` layouts. This is a legitimate secondary auth layer, but without middleware there's no guaranteed session-cookie refresh across Server Component navigation — verify this doesn't cause premature logouts in production before launch.
5. **Course publish state is genuinely mixed right now**: `courses.status` for `7-day-reset-meditation-series` was set to `'draft'` by the base migration/seed, but the new E2E script and `supabase/scripts/publish-reset-welcome-e2e.sql` diverge — the SQL script only publishes the Welcome module/lesson and explicitly leaves the course in draft, while the `.mjs` script publishes the *entire course*. Confirm which was actually run against your target environment before go-live; do not assume "draft" from the migration file reflects current DB state.

> **Note (post-audit):** Task B added transactional Resend infrastructure on branch `feat/transactional-email-foundation`. P0 item 3 is partially addressed for Resend emails only; GHL and Cron remain unimplemented. Re-verify before launch.

## Configuration Steps (exact, actionable)

### 1. Vercel environment variables
Add all 15 keys below to the Vercel project (Production **and** Preview, using different Stripe/Mux/Supabase projects per environment per TDD §19.1). `.env.local` currently defines the same 15 keys as `.env.example` — no drift there, but that only reflects local dev, not Vercel.

### 2. `NEXT_PUBLIC_APP_URL`
Currently used for: password-reset redirect, Stripe checkout success/cancel URLs, billing portal return URL, certificate verification links, and Mux upload CORS origin (`cors_origin: env.NEXT_PUBLIC_APP_URL`). Must be set to the exact production origin (e.g. `https://app.elevatehealthsolutions.com`, no trailing slash) in Vercel Production env — a mismatch here breaks Stripe redirects and Mux direct-upload CORS.

### 3. Supabase Site URL & redirect allowlist
- `supabase.auth.signUp()` is called **without** `emailRedirectTo` (`src/features/auth/services/auth.service.ts:352`), so the confirmation email link falls back to the Supabase project's **Site URL** setting. This must be changed from `localhost:3000` (Supabase default) to the production `NEXT_PUBLIC_APP_URL` in Supabase Dashboard → Authentication → URL Configuration.
- `forgotPassword` **does** pass an explicit `redirectTo: ${NEXT_PUBLIC_APP_URL}/reset-password` — this URL must be added to the Supabase **Redirect URLs allowlist**, or the reset link will be rejected.
- There is no `/auth/callback` route in the app (only email/password flows exist today, no OAuth/magic link), so no additional callback allowlisting is needed unless that's added later.

### 4. Stripe webhook
- Endpoint: `POST /api/stripe/webhook` (`src/app/api/stripe/webhook/route.ts` → `handleStripeWebhook`).
- Verifies `Stripe-Signature` via `stripe.webhooks.constructEvent(..., env.STRIPE_WEBHOOK_SECRET)`. Missing/invalid signature returns 400 without processing.
- Required events (must be enabled on the Stripe webhook endpoint config):
  - `checkout.session.completed` (both `mode: subscription` and `mode: payment` handled)
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `invoice.payment_failed`
- Idempotency: events are recorded in `webhook_events` keyed by `provider_event_id`; duplicates are detected via unique constraint (`23505`) and skipped once already `processed`/`ignored`. Point the **production** Stripe webhook at the production URL and copy the resulting signing secret into `STRIPE_WEBHOOK_SECRET` for that environment (do not reuse the test-mode secret).

### 5. Mux webhook
- Endpoint: `POST /api/mux/webhook` (`src/app/api/mux/webhook/route.ts` → `handleMuxWebhook`).
- Verifies signature via `mux.webhooks.unwrap(payload, headers)`, using `webhookSecret: env.MUX_WEBHOOK_SECRET` configured in the Mux client (`src/server/integrations/mux/client.ts`).
- Handled events: `video.asset.ready`, `video.asset.updated`, `video.asset.errored`, `video.upload.asset_created`. Other events are recorded and marked `ignored` (not an error).
- Same `webhook_events` idempotency pattern as Stripe. Create a separate Mux webhook endpoint in the production Mux environment pointing at the production URL and set `MUX_WEBHOOK_SECRET` accordingly.

### 6. Resend domain / from-address
Configure `RESEND_API_KEY` in Vercel. Verify a production sending domain in Resend and update the from-address in `src/server/integrations/resend/transactional-email.service.ts` (currently `onboarding@resend.dev` for dev). See `src/emails/README.md` for Stripe vs Resend ownership.

### 7. Vercel deployment protection
Not verifiable from the repo (this is a Vercel project setting, not code). Manually confirm in Vercel Dashboard → Project → Settings → Deployment Protection:
- Production URL should **not** have Vercel's password/SSO protection enabled (it would block real users and Stripe/Mux webhook deliveries, which don't carry Vercel auth).
- Preview deployments can keep protection enabled, but note webhooks (Stripe/Mux) cannot reach a protected preview URL — use Stripe/Mux CLI forwarding or a dedicated staging URL without protection for webhook testing instead.

### 8. First admin/super_admin
No self-service or seed path exists. After first production deploy:
1. Sign up a real account for the platform owner through the normal `/signup` flow (creates a `profiles` row with `role = 'user'`).
2. In Supabase Dashboard → SQL Editor (production project), run:
   ```sql
   update public.profiles set role = 'super_admin' where email = 'owner@example.com';
   ```
3. That super_admin can then promote additional admins via **Admin → Members** in-app (`updateMemberRole`), which enforces "cannot change your own role" and requires the actor to already be `super_admin`.

## Verification Checklist

- [ ] All 15 env vars present in Vercel Production (and Preview, with non-production provider keys)
- [ ] `NEXT_PUBLIC_APP_URL` = exact production HTTPS origin, no trailing slash
- [ ] Supabase Site URL updated to production origin
- [ ] `/reset-password` added to Supabase redirect allowlist
- [ ] Stripe production webhook endpoint created, pointed at `/api/stripe/webhook`, correct 6 events enabled, signing secret in `STRIPE_WEBHOOK_SECRET`
- [ ] Mux production webhook endpoint created, pointed at `/api/mux/webhook`, secret in `MUX_WEBHOOK_SECRET`
- [ ] Resend domain verified and production from-address configured
- [ ] Confirm whether GHL/Cron are in scope for this launch; if yes, implement before go-live; if no, document the decision in DECISIONS.md
- [ ] Vercel Deployment Protection disabled on the production URL (webhooks must reach it unauthenticated)
- [ ] First `super_admin` promoted via direct SQL and verified able to access `/admin`
- [ ] Confirm actual current DB state of `courses.status` for `7-day-reset-meditation-series` and `videos.status` for the Welcome video in the target Supabase project (do not assume from migration files)
- [ ] If `welcome-mux-e2e.mjs` was run against production data, run `node scripts/welcome-mux-e2e.mjs --revert-course` (or manually set course/module/lesson back to `draft`) unless a partial Welcome-only launch is an intentional, approved decision
- [ ] Confirm no `.env.local` or real secrets are committed (verified clean as of this audit — see Known Risks)
- [ ] Decide/verify session-refresh behavior in production given no `middleware.ts` exists

## Environment Variable Table

| Name | Required | Where set |
|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes (client) | Vercel Production + Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (client) | Vercel; Supabase project settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (client) | Vercel; Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server-only) | Vercel (server env only — never client) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes (client) | Vercel; Stripe Dashboard (per mode: test/live) |
| `STRIPE_SECRET_KEY` | Yes (server-only) | Vercel; Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | Yes (server-only) | Vercel; generated per Stripe webhook endpoint |
| `MUX_TOKEN_ID` | Yes (server-only) | Vercel; Mux Dashboard access token |
| `MUX_TOKEN_SECRET` | Yes (server-only) | Vercel; Mux Dashboard access token |
| `MUX_SIGNING_KEY_ID` | Yes (server-only) | Vercel; Mux Dashboard signing key |
| `MUX_SIGNING_PRIVATE_KEY` | Yes (server-only) | Vercel; Mux Dashboard signing key (PEM) |
| `MUX_WEBHOOK_SECRET` | Yes (server-only) | Vercel; generated per Mux webhook endpoint |
| `RESEND_API_KEY` | Yes per `env.ts` | Vercel; Resend Dashboard |
| `GHL_API_KEY` | Yes per `env.ts` (unused in code today) | Vercel; GoHighLevel account |
| `CRON_SECRET` | Yes per `env.ts` (no consumer route exists today) | Vercel; self-generated, also set as header in Vercel Cron config |
| `SKIP_ENV_VALIDATION` | Optional, local dev only | `.env.local` only — never set in Vercel |

Note: `env.ts` skips validation whenever `NODE_ENV !== "production"`, so all of the above are only strictly enforced in the production build/runtime.

## Webhook Endpoints and Events

| Provider | Route | Verifies | Events handled |
|---|---|---|---|
| Stripe | `POST /api/stripe/webhook` | `Stripe-Signature` header via `STRIPE_WEBHOOK_SECRET` | `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed` |
| Mux | `POST /api/mux/webhook` | Mux signature via `mux.webhooks.unwrap()` + `MUX_WEBHOOK_SECRET` | `video.asset.ready`, `video.asset.updated`, `video.asset.errored`, `video.upload.asset_created` (all others recorded + marked `ignored`) |

Both handlers persist every event to `webhook_events` (provider, `provider_event_id`, status) before processing, giving idempotent replay protection via a unique constraint on `(provider, provider_event_id)`.

## Known Risks

- **Stand-in Mux Welcome clip**: `scripts/welcome-mux-e2e.mjs` uses a public demo MP4 as a placeholder and will publish the full course if run without reverting. Treat as a hard go/no-go gate — verify actual DB state before launch, not just the script's intent.
- **Draft course, mostly unmigrated content**: Only the Welcome lesson has (or can have) a real Mux asset; the remaining 21 lessons across 7 days are `draft` / `migration_status: not_started` per `docs/7-day-elevated-reset-media-checklist.md`. Do not flip `courses.status` to `published` until all 22 lessons are migrated, or explicitly decide on and document a partial launch.
- **No secrets or private media found committed to the repo.** Checked `.env.example`, `.env.local` (key names only — values not read/printed), and searched the tree for Stripe/Mux/Resend key patterns; only placeholder values exist in `.env.example`. `public/brand/*.png` and `src/app/icon.png` are ordinary brand assets, not sensitive.
- **GHL/Cron unimplemented** while required by env validation — either a scope gap versus TASKS.md/PRD launch criteria, or an intentional later-sprint deferral that should be reflected in DECISIONS.md.
- **No `middleware.ts`** for Supabase session refresh — current protection is enforced correctly at the layout level (`(dashboard)` and `(admin)` layouts both call `supabase.auth.getUser()` and redirect), which satisfies the security rule's "server-side session checks," but confirm this doesn't produce session-expiry edge cases under real traffic before launch.
- **Admin bootstrap requires a manual SQL step** in the production database — document this in your launch runbook so it isn't missed (currently no one can reach `/admin` on a fresh production database).
- **Vercel Deployment Protection** cannot be verified from the repo; must be checked directly in the Vercel dashboard, particularly to ensure Stripe/Mux webhooks can reach the production deployment unauthenticated.
