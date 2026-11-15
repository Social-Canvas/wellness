# Elevate Production Rollout

Do not start this checklist until a person intentionally chooses to change production. The draft pull request is not permission to merge.

Production origin: `https://elevate-healthsolutions.com`

Reviewed application commit: `5c886209d590c4c9ac14798891ae4fe0c34e553b` on `feature/elevate-handoff-gtm-bot-docs`. `origin/main` at review time is `08690fae807a5c77510246473e184dbf19062881`.

## Phase 0 — Before touching production

- Confirm a current Supabase backup or point-in-time recovery window exists. Do not restore over production.
- Confirm `origin/main` is still `08690fae807a5c77510246473e184dbf19062881`. If it has moved, stop and review the new commits before merging.
- In Vercel Production, confirm these names are set. Do not print the values. Do not add `GHL_API_KEY`.
  - `NEXT_PUBLIC_APP_URL` = `https://elevate-healthsolutions.com`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `RESEND_API_KEY`
  - `CRON_SECRET`
  - `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_PRIVATE_KEY`, `MUX_WEBHOOK_SECRET`
- Confirm the Stripe production webhook already targets `https://elevate-healthsolutions.com/api/stripe/webhook` and verifies `Stripe-Signature`. Do not create a second endpoint.
- Confirm the Supabase project is the one already serving production. Do not create a second project.
- Confirm `ritika.bizz@gmail.com` and `elevate.ritika@gmail.com` already exist as `super_admin`. Do not create or promote them again.
- Open the live site and confirm `/`, `/programs`, `/login`, and `/admin` behave as they do today.

## Phase 1 — Database

Apply these files in Supabase, in this order, before the production deploy. Do not edit them while applying.

### 1. `20261025180000_bot_review_flags.sql`

Adds `suspected_bot`, `bot_reason`, `bot_flagged_at`, and `bot_flagged_by` to `profiles` and `leads`. Adds a trigger so signed-in users cannot change their own role or bot flags. Existing rows stay unflagged. It does not delete rows.

Rollback: do not drop the columns after admins have saved reviews. Before any review is saved, the columns can be dropped only from a backup plan. Do not drop `profiles` or `leads`.

Check:

```sql
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and table_name in ('profiles', 'leads')
  and column_name in ('suspected_bot', 'bot_reason', 'bot_flagged_at', 'bot_flagged_by')
order by table_name, column_name;
```

Expect 8 rows.

### 2. `20261025190000_public_form_rate_limits.sql`

Creates `public.public_form_rate_limits` for hashed email and IP counters. Service role can select and insert. Anonymous and authenticated clients cannot read it. It does not store raw email or IP and does not delete rows.

Rollback: dropping the empty table removes only rate-limit history. Do not drop it after it contains rows unless those counters are meant to reset.

Check:

```sql
select to_regclass('public.public_form_rate_limits') as rate_limits_table;
```

Expect `public.public_form_rate_limits`.

### 3. `20261115120000_site_content_and_media.sql`

Creates `site_content` and `media_assets`, recreates `public.set_updated_at()`, and creates the public `site-media` bucket (JPEG, PNG, WebP, GIF, 5 MB). No anonymous write policy. It does not change existing pages until an admin saves an override.

Rollback: do not drop the tables after content has been saved. Before any admin save, the new tables and unused bucket can be removed. Do not delete objects that public pages already reference.

Check:

```sql
select to_regclass('public.site_content') as site_content,
       to_regclass('public.media_assets') as media_assets;
select id, public from storage.buckets where id = 'site-media';
```

Expect both tables and one public `site-media` bucket.

### 4. `20261115121000_flag_retreat_spam_leads.sql`

Sets `suspected_bot = true` and `bot_reason = 'retreat_spam_fingerprint'` on retreat leads from `retreats_page` created 9–13 Sep 2026 that are not already flagged. It does not delete leads and does not update accounts.

Rollback: only those rows can be unflagged by setting `suspected_bot = false`, `bot_reason = null`, and `bot_flagged_at = null` where `bot_reason = 'retreat_spam_fingerprint'` and `bot_flagged_by` is null. Do not delete the leads.

Check:

```sql
select count(*) as flagged_retreat_leads
from public.leads
where suspected_bot = true
  and bot_reason = 'retreat_spam_fingerprint'
  and lead_type = 'retreat'
  and source = 'retreats_page';
```

The 15 Nov 2026 audit found 44 matching leads. Re-count before treating 44 as required if new leads arrived.

## Phase 2 — External configuration

### Required before deployment

- Leave the Vercel Production values listed in Phase 0 in place. This release removes the `GHL_API_KEY` boot requirement. Do not add a placeholder.
- Leave `KIT_SYNC_ENABLED` unset or `false`. Do not turn Kit sync on in the same change as the deploy.
- Leave `TRANSACTIONAL_EMAIL_FROM` as `no-reply@elevate-healthsolutions.com` and Reply-To as `sender@elevate-healthsolutions.com` until Phase 5 says otherwise.
- Confirm the Stripe and Mux webhooks still point at the production origin. Do not rotate secrets as part of this deploy.

### Can be completed after deployment

- Cloudflare Turnstile: set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` only if the enquiry challenge should be on. Forms stay usable while both are unset.
- Supabase Auth custom SMTP: confirm it uses the verified Resend domain. See `docs/supabase-auth-email.md`.
- Kit: copy `KIT_NEWSLETTER_FORM_ID` from Kit after marketing confirms it. Historical ids `9811927` and `9812102` are not assumed. Enable `KIT_SYNC_ENABLED` only after that confirmation.
- GTM: confirm container `GTM-54JKK6HG` has GA4 tags for `signup`, `lead`, `begin_checkout`, and `purchase`. Do not add a second GA4 snippet.
- Invite `elevate.ritika@gmail.com` to GitHub, Vercel, Supabase, Stripe, Resend, GoDaddy, and Microsoft 365. Keep developer access. Do not send passwords or API keys.

## Phase 3 — Merge / Vercel

1. Merge the draft pull request into `main` only when this rollout has started.
2. Let Vercel Production build from that `main` push. Do not start a second manual production deployment.
3. Confirm the production deployment commit matches the merge commit.
4. Do not promote the branch preview as a separate production deploy.

## Phase 4 — Production smoke test

Run these only after the production deployment. Do not run them as part of preparing this document.

Open:

- `https://elevate-healthsolutions.com/`
- `https://elevate-healthsolutions.com/about`
- `https://elevate-healthsolutions.com/programs`
- `https://elevate-healthsolutions.com/retreats`
- `https://elevate-healthsolutions.com/nonprofits`
- `https://elevate-healthsolutions.com/live-breathwork`
- `https://elevate-healthsolutions.com/admin`
- `https://elevate-healthsolutions.com/admin/content`
- `https://elevate-healthsolutions.com/admin/products`
- `https://elevate-healthsolutions.com/admin/bots`

Then, signed in as an existing super admin:

- Save one harmless content field and confirm the public page updates without another deploy.
- Upload one image and select an existing image on a second field. Confirm the first use of that image still loads.
- Edit a product and confirm slug, price, and Stripe price id stay locked.
- Download the sales CSV and Excel for a date range. Confirm the renewal note is present.
- Sign up a real mailbox you control and confirm the confirmation email path.
- Submit one real enquiry you are willing to keep, then find it in Bot review.
- Start checkout and confirm the browser is sent to Stripe. `begin_checkout` may fire. Do not complete a live charge unless the client asked for that test.
- A `purchase` event fires only after local fulfillment is paid or active, with the Checkout Session id as `transaction_id`.
- Log out and log back in.

`/live-breathwork` with no upcoming session shows no purchase CTA. `/free-taster` stays out of the nav, sitemap, and index.

## Phase 5 — Email and DNS

Keep this separate from the app deploy. Do not change DNS until the checks below are done. Details are in `docs/EMAIL_DELIVERABILITY.md`.

1. In Microsoft 365, confirm whether `hello@`, `no-reply@`, and `sender@` are mailboxes or aliases.
2. In Resend, open the domain Records tab and copy the records exactly. Do not put `include:amazonses.com` on the apex. Use the `send` host, or the CNAMEs Resend shows for domains created after August 2026.
3. Keep one apex SPF record. If Microsoft mailboxes should pass SPF, edit that one record to `v=spf1 include:secureserver.net include:spf.protection.outlook.com -all`. Remove `secureserver.net` only after GoDaddy sending is confirmed unused.
4. Do not add a second `_dmarc` record. Do not replace `resend._domainkey` if it still matches Resend.
5. After Resend shows the domain verified, send a test to Outlook. Keep From as `no-reply@` until that test lands in Inbox and `hello@` is confirmed.
6. Point Supabase Auth SMTP at that verified domain only after the Resend test succeeds.
7. Add Kit DNS only when marketing turns Kit sending on.

## Phase 6 — Marketing

- Leave Kit sync off until the form id is confirmed.
- Signup, enquiry, purchase, and free claim do not subscribe anyone unless they check marketing consent.
- GA4 stays inside GTM container `GTM-54JKK6HG`. The site does not load a second GA4 snippet.
- Currency on `begin_checkout` and `purchase` is uppercase ISO 4217. Honeypot submissions do not fire signup or lead events.

## Phase 7 — Client handoff

Give the client:

- `https://elevate-healthsolutions.com` and `/admin`
- `docs/HANDOFF.md`, `docs/EMAIL_DELIVERABILITY.md`, `docs/CLIENT_ACTION_TRACKER.md`, `docs/FUTURE_SCOPE.md`, and this runbook
- Confirmation that both Ritika mailboxes are already super admins
- Service invites still to be sent, without passwords or API keys

The client can manage public wording, images, catalog text, publish state, product PDFs, leads, members, bot review, and the sales export.

Engineering still owns payment architecture, database changes, integrations, DNS, prices, Stripe ids, entitlements, and new product behavior.

## Emergency rollback

- Vercel: promote the previous Production deployment. The last production deployment recorded before this branch was commit `08690fa` on 22 Sep 2026. Confirm the current previous deployment in Vercel at rollback time. Do not deploy the branch preview as production in order to undo a release.
- Git: revert the merge commit on `main` with a new commit. Do not force-push `main`.
- Migrations: do not restore an older database dump over production. The flag migration and content tables are not safely undone by redeploying the old app. Follow the rollback notes in Phase 1, or restore into a separate Supabase project first.
- Never overwrite production Stripe customers, the `orders` table, `profiles`, or `leads` from a local file. Never delete the 44 flagged leads as a rollback.
