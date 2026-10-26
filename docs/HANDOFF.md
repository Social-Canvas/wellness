# Elevate Health Solutions — operations handoff

Last updated: 2026-10-26  
Branch: `feature/elevate-handoff-gtm-bot-docs` (not pushed)

This document is the operator handoff for the Next.js membership platform at **elevate-healthsolutions.com**. It includes the Phase 0 bot assessment. It does not contain secret values.

Production data cited below was read-only. No production rows were updated, flagged, or deleted.

---

## 1. Phase 0 — bot assessment (read-only)

**Verdict: BOT PROBLEM PARTIALLY CONFIRMED**

Accounts are **not** a bot flood. All **44** retreat enquiries **are** external form spam on public `/retreats` (`LeadEnquiryForm` → `submitLeadAction`). They are **not** from our E2E/smoke tests or seed scripts. The client belief that *most of ~222 accounts are bots* is **not** supported. Unconfirmed signups are more consistent with email confirmation plus deliverability issues.

### Accounts (`profiles` + `auth.users`)

| Metric | Count |
|---|---|
| Total profiles | 250 |
| Auth users fetched | 250 |
| Class A high-confidence bot/test | 0 (0%) |
| Class B suspicious | 30 (12%) |
| Class C likely legitimate | 40 (16%) |
| Class D unknown | 180 (72%) |
| Internal test / E2E emails | 0 |
| Email confirmed | 43 |
| Never confirmed | 207 |
| Never signed in | 207 |
| Any subsequent activity (orders, subs, progress, entitlements, certificates, live regs) | 1 |
| Paid order users | 0 |
| Roles | 246 user, 3 admin, 1 super_admin |

IP and user-agent are **not stored** on profiles or leads.

Largest per-minute signup burst: **1**. Busiest days were 2026-09-09 (32) through mid-September, which looks like a launch window, not a seconds-scale bot flood.

Top domains: gmail.com (104), yahoo.com (18), hotmail.com (11), plus ordinary ISP/corporate domains. Gmail/Yahoo was **not** used as a bot signal.

### Enquiries (`leads`)

**Origin:** public `/retreats` form, not our tests. Every row is `lead_type=retreat` / `source=retreats_page` with our Interest dropdown values and `Interest:` / `Location:` message prefixes.

| Metric | Count |
|---|---|
| Total leads | 44 |
| Unique emails | 30 |
| Class A high-confidence | **44 (100%)** |
| Class B suspicious | 0 |
| Class C likely legitimate | 0 |
| Class D unknown | 0 |
| Internal test leads | 0 |
| Lead type / source | all `retreat` / `retreats_page` |
| Repeat-email groups | 4 emails used 2, 3, 6, and 7 times (18 of 44 rows) |

Fingerprint on all 44: name and location each exactly 10 alphanumeric characters with no spaces (often digit-leading names); user-typed message body ~55 letters+digits with no spaces. Submitted 9–13 Sep 2026, 9–150 minutes apart (throttled drip, not a seconds-scale burst). Consumer email domains, not `@example.com` / `e2e-` / `smoke-`.

An earlier conservative split (16 suspicious / 28 likely legitimate) treated repeat-email as the main signal and missed this generated-token pattern. The origin audit is the accurate one: **leads A=44**.

No URL spam. In-memory 5/15-min rate limits on Vercel serverless did not hold, and a 15-minute window would not have stopped 6–7 repeats of the same email over days.

### Classification rules used

| Rule | Why suspicious | Match (this audit) | Confidence | False-positive risk |
|---|---|---|---|---|
| Internal test email / prefixes (`e2e-`, `smoke-`, `test-`, `browser-`, `verify-`, `imp-`, `raw-`, `@example.com`, exact E2E addresses) | Known internal fixtures | Accounts 0, leads 0 | High | Low |
| 10-char alphanumeric name/location + ~55-char junk body (no spaces; digit-leading names common) | Generated `/retreats` form spam | **44 / 44 leads** | High | Low (real names like Jane Smith / Rishikesh do not match) |
| Repeat enquiry email (4+) | Same address, many retreat submits | 18 of 44 lead rows (4 emails) | Heuristic overlay | Medium (user retries) |
| Nonsense name | Keyboard smash / non-alpha names | subsumed by fingerprint on leads; 1 account | Heuristic | Medium |
| Generated-looking email local (10+ letters, almost no vowels) | Common bot mailbox pattern | 30 accounts (mostly Class B) | Heuristic | **High** (real surnames) |
| Unconfirmed + never signed in + no activity | Abandoned or undelivered confirmations | 180 accounts, Class D | Not used alone | High if used as bot |
| Signup burst (≥8 in one minute) | Automated signup | 0 | High if present | Low |
| Identical message cluster + URL | Classic spam | 0 | High | Low |
| Never purchased / Gmail / unusual name / incomplete profile | Not used | — | — | — |

Internal test data was separated from external spam. Production currently has **no** internal E2E emails.

### Operators

- `ritika.bizz@gmail.com` **exists**, role **`user`** (not Super Admin).
- `elevate.ritika@gmail.com` **does not exist**.
- One unrelated `super_admin` and three `admin` accounts already exist (emails omitted here).

### What is safe to auto-flag vs manual review

**Safe to auto-flag later (high-confidence only):** internal test/E2E patterns (production match **0**) and the retreat spam fingerprint (production match **44** leads). This branch still does **not** bulk-UPDATE those rows.

**Manual review only:** Class B accounts; operators should flag the 44 retreat leads individually from Admin → Bot review after looking at the dry-run. Do **not** bulk-flag the 207 unconfirmed users.

**Do not flag:** inactivity, Gmail/Yahoo, no purchase, incomplete profile.

This branch adds Admin → **Bot review** (`/admin/bots`) with a dry-run report and single-record flag. It does **not** UPDATE existing production rows.

### Protection recommendation

Turnstile is **justified for public enquiry forms** (this campaign skipped the honeypot and dripped slower than a 15-minute memory limit). Optional on signup. Email confirmation already exists and should stay on. Honeypot stays. New server-side **spam fingerprint** rejects the 10-char / ~55-char generated payload (generic user error; reasons logged without PII). Rate limits are **durable (Supabase `public_form_rate_limits`)**, keyed independently by **hashed email AND hashed IP**, with a 15-minute burst plus a longer drip cap. Turnstile is skip-when-unset until production keys are added. Fingerprint rejection still consumes the rate-limit quota.

**Lead / retreat / enquiry limits** (either key blocks; generic user error):

| Key | Burst | Longer window |
|---|---|---|
| Email | 3 / 15 min | **3 / 24 h** |
| IP | 5 / 15 min | **5 / 1 h** |

Signup: 3 email / 15 min and 5 email / 24 h; 5 IP / 15 min and 10 IP / 1 h. Forgot-password and resend-verification use a separate `auth_email` counter with the same numbers. In-memory maps remain a same-instance fallback only.

The 15-minute window alone would **not** have stopped the 6–7 repeats from one email over days. The 24 h email cap would have allowed 3 of those and blocked the rest. Unique one-off emails (the remaining ~26 of 44) are caught by the **fingerprint** (this campaign) plus Turnstile/honeypot (future variants).

**Fingerprint rules (submit-time, high-confidence / low false-positive):**

- Reject name or location that is exactly 10 alphanumeric characters, no spaces, and contains a digit (covers digit-leading generated names).
- Reject the **user-typed** message body when it is ~55 (53–57) letters+digits with no spaces. `Interest:` / `Location:` prefixes added by `composeRetreatEnquiryMessage` are stripped before this check.
- Allow real values such as `Jane Smith` and `Rishikesh`.
- Generic visitor error; log `reasons` + `leadType` only (no email, name, or message).
- Does not delete rows. Existing 44 leads stay until a human flags them.

---

## 2. Service inventory

| Service | Purpose | Production resource (if known from repo/DNS) | Owner email in repo | `elevate.ritika@gmail.com` invite? |
|---|---|---|---|---|
| Vercel | Hosting, cron, env | `www` CNAME `*.vercel-dns-017.com`; GitHub repo `Social-Canvas/wellness` | Not in repo | **Yes, if they should deploy** |
| Supabase | Postgres, Auth, Storage, RLS | `.env` `NEXT_PUBLIC_SUPABASE_URL` (project URL, not printed) | Not in repo | **Yes, if they should run SQL / Auth / backups** |
| Stripe | Checkout, portal, webhooks | Live vs test from env key prefix; local DB had 0 paid orders | Not in repo | **Yes, if they should see payments** |
| Resend | Transactional email | DKIM `resend._domainkey` present on apex | Not in repo | **Yes, if they should manage sending domain** |
| Kit | Marketing lists only | `KIT_SYNC_ENABLED` often false; no Kit DKIM observed | Not in repo | Invite only if marketing sync is going live |
| GoDaddy DNS | Nameservers `ns27`/`ns28.domaincontrol.com` | Apex A records + Microsoft MX | Not in repo | **Yes, for SPF/DKIM/DMARC edits** |
| Microsoft 365 | Mailbox / MX | MX `elevatehealthsolutions-com01i.mail.protection.outlook.com` | Not in repo | **Yes, to confirm `hello@` mailbox** |
| Mux | Signed member video + public homepage testimonials | Env `MUX_*` | Not in repo | Invite if they manage video |
| Zoom | Live session participant/host URLs in `live_class_secrets` | Not in public rows | Not in repo | Invite if they host live classes |
| Calendly | External scheduling (no internal bookings DB) | Optional `calendly_url` on live classes | Not in repo | Invite if they own scheduling |
| GitHub | Source | `Social-Canvas/wellness` | Not in repo | **Yes, for code access** |
| Cloudflare Turnstile | Optional bot challenge | Env names only until keys are set | Not in repo | Create in Cloudflare, then set Vercel env |
| GHL | Env key required for production boot; **no live GHL client** in `src/` | `ghl_sync_status` columns exist | Not in repo | Not required unless GHL is revived |
| Google Search Console | TXT `google-site-verification=…` on apex | Verification record present | Not in repo | Optional |

Never invent owners. If an email is not in the repo, it is listed as unknown.

---

## 3. Environment variable names (never values)

Grouped by provider. `required` means production boot via `src/lib/config/env.ts` unless noted.

### App / Vercel

| Name | Required | Where | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | required | client | Canonical origin (`https://elevate-healthsolutions.com`, no trailing slash) |
| `NEXT_PUBLIC_SITE_URL` | optional | client | SEO/sitemap override |
| `VERCEL_ENV` / `VERCEL_URL` | platform | server | Preview origin fallback |
| `SKIP_ENV_VALIDATION` | optional | server | Local skip |
| `CRON_SECRET` | required | server | Bearer for `/api/cron/*` |

### Supabase

| Name | Required | Where | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | required | client | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | required | client | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | required | server | Admin / webhooks / cron |

### Stripe

| Name | Required | Where | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | required | client | Checkout.js / mode checks |
| `STRIPE_SECRET_KEY` | required | server | Checkout, portal, retrieve |
| `STRIPE_WEBHOOK_SECRET` | required | server | Signature verify |

### Mux

| Name | Required | Where | Purpose |
|---|---|---|---|
| `MUX_TOKEN_ID` | required | server | API token |
| `MUX_TOKEN_SECRET` | required | server | API secret |
| `MUX_SIGNING_KEY_ID` | required | server | Signed playback |
| `MUX_SIGNING_PRIVATE_KEY` | required | server | Signed playback |
| `MUX_WEBHOOK_SECRET` | required | server | Mux webhook verify |

### Resend / transactional email

| Name | Required | Where | Purpose |
|---|---|---|---|
| `RESEND_API_KEY` | required | server | Send API |
| `TRANSACTIONAL_EMAIL_FROM` | optional in env.ts; **required for real sends** | server | Verified From |
| `TRANSACTIONAL_EMAIL_REPLY_TO` | optional | server | Reply-To |
| `ENQUIRY_NOTIFICATION_TO` | optional | server | Admin enquiry inbox |
| `EMAIL_DELIVERY_ENABLED` | optional | server | Kill switch |
| `EMAIL_REQUIRE_ALLOWLIST` | optional | server | Default true outside production |
| `EMAIL_TEST_RECIPIENT_ALLOWLIST` | optional | server | Test recipients |
| `EMAIL_ALLOW_RESEND_DEV_FROM` | optional | server | Non-prod `onboarding@resend.dev` |
| `EMAIL_OUTBOX_BATCH_SIZE` | optional | server | Cron batch |
| `EMAIL_OUTBOX_MAX_ATTEMPTS` | optional | server | Retry cap |

### Kit (marketing only)

| Name | Required | Where | Purpose |
|---|---|---|---|
| `KIT_API_KEY` | optional | server | Kit API |
| `KIT_SYNC_ENABLED` | optional | server | Must be true to sync |
| `KIT_NEWSLETTER_FORM_ID` | optional | server | Newsletter form |
| `KIT_REQUEST_TIMEOUT_MS` | optional | server | Timeout |
| `KIT_CONSENT_SYNC_BATCH_SIZE` | optional | server | Cron batch |

### Turnstile (optional)

| Name | Required | Where | Purpose |
|---|---|---|---|
| `TURNSTILE_SITE_KEY` | optional | server, passed to widget | Public site key |
| `TURNSTILE_SECRET_KEY` | optional | server | Siteverify |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | optional alias | client | Same public key if not using the server pass-through |

When both Turnstile keys are unset, public forms **skip** the challenge (local and production). Set both in Vercel Production after creating the widget.

### Other

| Name | Required | Where | Purpose |
|---|---|---|---|
| `GHL_API_KEY` | required by `env.ts` | server | Boot-time presence only; no GHL client in `src/` |

GTM container ID `GTM-54JKK6HG` is **hardcoded**. Do not add `NEXT_PUBLIC_GA_ID` or a gtag snippet.

---

## 4. Operations

### Local setup

```bash
npm install
cp .env.example .env.local
# fill local (non-production) keys
npm run dev
```

Env validation is skipped unless `NODE_ENV=production` or `SKIP_ENV_VALIDATION=false`.

### Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm test` | `node --test "src/**/*.test.ts"` |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck (no dedicated script) |
| `npm run build` | Production build |
| `npm start` | Serve the build |

### Deploy

`main` → Vercel Production. Feature branches → Preview. Do not use production secrets locally.

### Database

Postgres lives in **Supabase** (not Vercel). Migrations: `supabase/migrations/`. Apply with Supabase CLI or Dashboard SQL. This branch adds `20261025180000_bot_review_flags.sql` (non-destructive flags + privileged-column trigger) and `20261025190000_public_form_rate_limits.sql` (append-only hashed email/IP rate-limit events, service-role only).

### Stripe webhooks

`POST /api/stripe/webhook` — verify `Stripe-Signature`, store `webhook_events.provider_event_id`, process idempotently.

Handled events:

- `checkout.session.completed` (payment → paid `orders` / entitlements; subscription → subscription sync)
- `customer.subscription.created|updated|deleted`
- `invoice.paid`
- `invoice.payment_failed`

Entitlements are granted **from the webhook**, never from the success URL.

### Resend vs Kit

- **Resend:** transactional (lifecycle outbox, enquiry admin/visitor, purchase, certificate).
- **Kit:** marketing consent lists only. Disabled unless `KIT_SYNC_ENABLED=true` and `KIT_API_KEY` set.
- **Supabase Auth SMTP:** confirm/reset/invite. See `docs/supabase-auth-email.md`. Not the membership outbox.

Cron (Vercel Hobby, `vercel.json`):

- `/api/cron/transactional-email` daily 06:00 UTC
- `/api/cron/kit-consent-sync` daily 07:00 UTC

### Backup / recovery

Safest: **Supabase Dashboard → Project Settings → Database → Backups** (Pro daily backups) plus a one-off dump from Dashboard SQL or `pg_dump` to an operator machine. **Do not commit dumps.** Do not restore over production without an explicit restore ticket.

This repo gitignores `.local/`. Aggregated read-only counts may live there; never commit PII-heavy exports.

---

## 5. Stripe

From repo + read-only local DB (not Stripe Dashboard):

- Production previously had **0 paid orders** and **1 complimentary subscription**. A pre-launch Stripe invoice was **not** Elevate’s. That does **not** by itself prove the live Stripe account is or is not Elevate-owned. Confirm in Stripe Dashboard (account name, payouts, connected domain).
- Products/plans referenced in code: membership `plan-1` (Core), `plan-2` (Gold), `plan-3` (Platinum); products `7-day-reset`, `autoimmune-masterclass`, free Integration Journal (`free_claim`), live Breathwork trial, hidden `health-professional-session`.
- Price IDs live in `plan_prices.stripe_price_id` and `products.stripe_price_id`. Never trust client-submitted price IDs.
- Webhook endpoint: production origin + `/api/stripe/webhook`.
- Test-mode sessions (`cs_test_*`) are excluded from admin sales metrics.

No signing secrets are stored in git.

---

## 6. Database backup status

- **In-repo dump:** none (by design).
- **Operator file:** `.local/bot-audit-report.json` is gitignored aggregated audit output only.
- **Recommended production backup:** enable Supabase PITR/daily backups on the paid plan; export schema from Dashboard; keep a documented restore owner.
- **Do not** overwrite production to “test restore.” Restore into a separate project.

---

## 7. Admin pages: Bookings, Settings, Certificates

| Nav item | Route | Status |
|---|---|---|
| Bookings | `/admin/bookings` | **Unused placeholder.** Calendly/Zoom are operational elsewhere. No bookings CRUD. |
| Settings | `/admin/settings` | **Unused placeholder.** No secrets UI. Roles: Admin → Members. Env: Vercel. |
| Certificates | `/admin/certificates` | **Partially implemented elsewhere.** Member list `/dashboard/certificates`; public verify `/certificate/verify/[token]`; admin name correction on **Members**. Dedicated admin certificate list is not built. |
| Bot review | `/admin/bots` | **New.** Dry-run + single-record flag. Does not bulk-write. |

---

## 8. Email / DNS findings (no DNS was changed)

Live lookup for `elevate-healthsolutions.com` on 2026-10-25:

| Record | Observed |
|---|---|
| NS | GoDaddy `ns27`/`ns28.domaincontrol.com` |
| A | `64.29.17.1`, `216.198.79.1` (Vercel) |
| www CNAME | Vercel DNS |
| MX | Microsoft 365 (`*.mail.protection.outlook.com`) |
| Autodiscover | `autodiscover.outlook.com` |
| SPF (apex TXT) | **one** record: `v=spf1 include:secureserver.net -all` |
| DMARC | **one** record: `v=DMARC1; p=none;` |
| Microsoft DKIM | `selector1`/`selector2` CNAMEs to `*.dkim.mail.microsoft` |
| Resend DKIM | `resend._domainkey` TXT `p=MIGf...` present |
| Kit DKIM (`s1._domainkey` / `s2._domainkey`) | **not present** |
| Resend `send.` zone | **not present** |

### Checklist

| Item | Status | Manual action |
|---|---|---|
| Microsoft/Outlook receiving | MX points at Outlook; mailbox existence **not verified from DNS** | In M365, confirm `hello@elevate-healthsolutions.com` is a mailbox or alias |
| SPF | Single root SPF exists. It does **not** include Microsoft (`spf.protection.outlook.com`) or Resend/Amazon SES. `-all` is a hard fail for those senders | **Do not add a second SPF TXT.** Merge includes into the existing record after confirming Resend’s current include (typically `include:amazonses.com`) |
| DKIM | Microsoft selectors present; Resend `resend._domainkey` present | Confirm Resend Dashboard domain = Verified |
| DMARC | `p=none` only | **Do not add a second DMARC.** Tighten `p=` later after SPF/DKIM align |
| Resend sending auth | DKIM yes, SPF no | Merge SPF; keep From on the verified domain |
| Kit sending auth | No Kit DKIM observed | Add Kit records only if Kit sending is enabled |
| Supabase Auth SMTP | Code expects custom SMTP via Resend (`docs/supabase-auth-email.md`) | Confirm in Supabase Dashboard. 207 unconfirmed users may be undelivered Auth mail |

### `hello@elevate-healthsolutions.com` as Resend From

**Not safe to switch production From until:**

1. M365 shows the mailbox/alias exists (or a group that can receive replies).
2. Resend domain verify is green for `elevate-healthsolutions.com`.
3. The **existing** SPF is updated to authorize Resend **and** Microsoft in **one** record (no second SPF).
4. `TRANSACTIONAL_EMAIL_FROM` / Reply-To match the verified domain.
5. A test send to an allowlisted inbox passes Microsoft junk checks.

Do **not** change production sender in this branch.

Expected (illustrative, not applied):

```
v=spf1 include:secureserver.net include:spf.protection.outlook.com include:amazonses.com -all
```

Confirm the Resend include in their dashboard before editing DNS. Blindly merging SPF can break mail.

---

## 9. Super Admin onboarding (no production writes in this task)

App-side: `profiles.role` enum includes `super_admin`. Admin layout and mutations already check it. `ritika.bizz@gmail.com` and `elevate.ritika@gmail.com` **can** be Super Admins; the app does not fabricate accounts.

Constants: `src/lib/constants/super-admin-emails.ts`.

### If the person already has a login (`ritika.bizz@gmail.com` does)

After a current Super Admin is signed in: **Admin → Members → set role Super admin**.

Or SQL in Supabase (production SQL editor), after confirming the email:

```sql
update public.profiles
set role = 'super_admin'
where lower(email) in (
  'ritika.bizz@gmail.com',
  'elevate.ritika@gmail.com'
);
```

Do not run this as part of this code change.

### If the person has no account (`elevate.ritika@gmail.com`)

1. They sign up at `/signup` and confirm email.
2. Then grant `super_admin` via SQL or Members (once a Super Admin exists).

This migration also blocks authenticated users from self-updating `role` or bot-flag columns (service_role / admin client only).

---

## 10. Known unfinished / production-risk items

### Production risk

- **Email SPF/DKIM mismatch** (above). High impact on Auth confirmation and Outlook.
- **`GHL_API_KEY` required to boot production** but there is **no GHL client**. Keep a dummy-or-real value so `env.ts` does not fail; GHL sync is not live.
- **No `middleware.ts`.** Session refresh relies on server `getUser()` in layouts. Watch for stale cookies.
- **Admin Bookings/Settings 404s are now placeholders**; Certificates admin list is still not a real queue.
- **In-memory rate limits** still exist as a same-instance burst fallback. Durable hashed email+IP counts in `public_form_rate_limits` are the cross-instance control (15-minute burst + 24 h email cap / 1 h IP cap for leads). If that table is missing, the limiter fails open and logs a warning. Fingerprint rejection does not skip the limiter.
- `docs/production-readiness-audit.md` is **stale** in places (it predates Resend, cron, `emailRedirectTo`). Prefer this HANDOFF.

### Harmless / future

- Dedicated admin certificates list.
- Internal bookings calendar (out of MVP; Calendly remains source of truth).
- Settings UI for integrations.
- Kit sync still off by default.
- Advanced analytics UI (GTM/GA4 is the launch path).
- MFA for admins (post-MVP).

Cleanup scripts `scripts/cleanup-test-users.mjs` / `scripts/cleanup-test-leads.mjs` were **not present**. Do not run destructive cleanup against production.

---

## 11. Analytics events (this branch)

GTM `GTM-54JKK6HG` once in `src/app/layout.tsx`. Typed helper: `src/lib/analytics/`. No PII (no email, phone, message, health).

| Event | When | Payload |
|---|---|---|
| `signup` | After successful `signUp` (including confirm-email-needed) | `{ event: "signup" }` |
| `lead` | After lead row persisted | `{ event: "lead", lead_type, source? }` |
| `begin_checkout` | After Stripe session created, **before** browser redirect | item id, optional value/currency |
| `purchase` | Checkout success page only after local paid/active fulfillment | `transaction_id` = checkout session id; deduped in `sessionStorage` |

Purchase is **not** fired from the success URL alone.

---

## 12. Manual production steps still needed

1. Merge this branch after review. **Do not deploy from this agent.**
2. Apply migrations `20261025180000_bot_review_flags.sql` and `20261025190000_public_form_rate_limits.sql` on production Supabase.
3. Grant Super Admin to Ritika emails using the SQL/Members path above (human step).
4. Invite `elevate.ritika@gmail.com` to Vercel, Supabase, GitHub, Stripe, Resend, GoDaddy, M365 as needed.
5. Confirm `hello@` mailbox; merge SPF (one record); verify Resend domain; then set `TRANSACTIONAL_EMAIL_FROM`.
6. Confirm Supabase Auth custom SMTP and templates (`docs/supabase-auth-email.md`).
7. Add Cloudflare Turnstile keys to Vercel Production (`TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`).
8. Confirm GTM-54JKK6HG in the client’s GTM account has GA4 tags for `signup`, `lead`, `begin_checkout`, `purchase`.
9. Point/confirm Stripe + Mux production webhooks at the production origin.
10. Use Admin → Bot review dry-run; flag the 44 fingerprint-matching retreat leads individually after human review. Do not bulk-update. Do not flag unconfirmed accounts from inactivity alone.

---

## 13. Bot-review dry-run script (read-only)

```bash
node --env-file=.env.local scripts/bot-audit-dry-run.mjs
```

Writes aggregated JSON to `.local/bot-audit-report.json` (gitignored). Never writes to Supabase.
