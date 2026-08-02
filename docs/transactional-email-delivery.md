# Transactional email delivery (ops)

Membership and nonprofit seat emails go through `membership_lifecycle_events` outbox → Resend.

Purchase confirmation, Reset course unlock, and certificate emails remain direct Resend sends (still transactional, not marketing).

## Required environment variables

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Resend API key (server-only) |
| `TRANSACTIONAL_EMAIL_FROM` | Verified sender, e.g. `Elevate Health Solutions <hello@your-verified-domain>` |
| `TRANSACTIONAL_EMAIL_REPLY_TO` | Optional reply-to address |
| `NEXT_PUBLIC_APP_URL` | Absolute app origin for CTAs |
| `CRON_SECRET` | Bearer secret for `/api/cron/transactional-email` |
| `EMAIL_DELIVERY_ENABLED` | `true`/`false` kill switch |
| `EMAIL_TEST_RECIPIENT_ALLOWLIST` | Comma-separated emails allowed when allowlist mode is on |
| `EMAIL_REQUIRE_ALLOWLIST` | Default `true` outside production; set `true` in production only for controlled tests |
| `EMAIL_ALLOW_RESEND_DEV_FROM` | Non-production only; allows `onboarding@resend.dev` when From unset |
| `EMAIL_OUTBOX_BATCH_SIZE` | Optional (default 10) |
| `EMAIL_OUTBOX_MAX_ATTEMPTS` | Optional (default 8) |

## Safety rules

- Production never uses `@resend.dev` as From.
- Production never silently redirects customer mail to a developer inbox.
- Preview/test must use `EMAIL_REQUIRE_ALLOWLIST=true` + allowlist.
- Outbox stores user ids, not rendered HTML or provider response bodies.
- Email failure never revokes membership access.

## Cron

`GET/POST /api/cron/transactional-email` with `Authorization: Bearer $CRON_SECRET`.

Vercel Cron: `vercel.json` schedules daily at 06:00 UTC (`0 6 * * *`) as retry/recovery on Hobby. Immediate best-effort send also runs after enqueue.

## Controlled test mode

1. Set `EMAIL_DELIVERY_ENABLED=true`
2. Set `EMAIL_REQUIRE_ALLOWLIST=true`
3. Set `EMAIL_TEST_RECIPIENT_ALLOWLIST` to operator inboxes only
4. Confirm Resend domain verified and `TRANSACTIONAL_EMAIL_FROM` matches it
5. Insert fixture lifecycle events (never reuse real customer event ids)
6. Run processor / cron
7. Delete fixture rows after verification

Never send test mail to real customers.
