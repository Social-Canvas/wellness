# Transactional Email Responsibilities

This folder contains Elevate transactional email templates and shared layout code.

## Stripe vs Resend (avoid duplicates)

- Stripe remains the source for payment receipts, invoices, and card/payment-method notifications.
- Resend is used for product/access lifecycle messaging that is specific to app UX:
  - purchase confirmation
  - membership activated
  - Reset course access granted
  - payment failed follow-up (action prompt, not a Stripe receipt)
  - certificate earned

## Triggering and idempotency notes

- Stripe webhook replay dedupe is handled by `webhook_events.provider_event_id`.
- Purchase and membership emails are only sent on state transitions (for example, not when an order/subscription is already marked paid/active).
- Certificate emails are only sent on newly issued certificates (not when a duplicate existing certificate is returned).
- All send calls are non-blocking to business-critical flows: failures are logged and never throw into payment/access logic.
