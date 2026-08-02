# Transactional Email Responsibilities

This folder contains Elevate transactional email templates and shared layout code.

## Stripe vs Resend (avoid duplicates)

- Stripe remains the source for payment receipts, invoices, and card/payment-method notifications.
- Resend is used for product/access lifecycle messaging that is specific to app UX:
  - purchase confirmation (direct send)
  - Reset course access granted (direct send)
  - certificate earned (direct send)
  - membership + nonprofit seat lifecycle (outbox via `membership_lifecycle_events`)

## Membership lifecycle outbox

- Event enqueue: `recordMembershipLifecycleEvent` (persist first).
- Delivery: `processLifecycleEmailOutbox` + `/api/cron/transactional-email`.
- Auth emails (confirm / reset / invite) remain Supabase Auth — see `docs/supabase-auth-email.md`.
- Ops guide: `docs/transactional-email-delivery.md`.

## Triggering and idempotency notes

- Stripe webhook replay dedupe is handled by `webhook_events.provider_event_id`.
- Lifecycle email dedupe: unique `(source_event_id, event_type)` plus local `email_status = sent`.
- Purchase emails are only sent on state transitions (for example, not when an order is already paid).
- Certificate emails are only sent on newly issued certificates.
- All send calls are non-blocking to business-critical flows: failures are logged and never revoke access.
