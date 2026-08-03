# Membership renewal & live-session access semantics

## Personal Stripe memberships (already in place)

- Stripe is source of truth. Webhooks sync `subscriptions` (`active`, `trialing`, `past_due`, `canceled`, `cancel_at_period_end`).
- Access continues while the local subscription is considered active: `active` / `trialing` with future `current_period_end`, including `cancel_at_period_end` until that end date.
- Member cancel sets Stripe `cancel_at_period_end` and mirrors locally; entitlement remains until period end.
- Success-page redirects never grant access — only webhook fulfillment.
- Downgrade scheduling stores `scheduled_plan_id` locally; applying the Stripe price change at period end remains a known gap (portal / follow-up work). Do not invent a parallel billing engine for MVP.

## Complimentary access

- Prefixed synthetic subscription IDs (`comp_launch_testing_*`) provide preview membership without Stripe.
- Same capability resolution path as personal memberships.

## Nonprofit-sponsored access

- Individual accounts via `organization_members`.
- `organizations.plan_id` / member `assigned_plan_id` control **content** (Core-equivalent = `plan-1`).
- `organizations.billing_tier` (`small` | `mid_size` | `large` | `enterprise`) controls **seats/billing band only** — never Gold/Platinum content.
- Enquiry-only public pricing for nonprofit seat bands; no self-serve org Checkout in MVP.

## Shared live + recordings

- One `live_classes` schedule for all members with `live_online_sessions`.
- One `recorded_sessions` archive for all members with `session_replays`.
- After a live session completes, admins attach a recording (`recorded_sessions.live_class_id`) into the shared archive.

## Live Breathwork one-time trial

- Not a membership. Registration is session-scoped via webhook metadata.
- Join uses the same participant Zoom URL as members, released only after confirmed registration + join window.
- No recordings / future sessions / Member badge.
- $55 catalog amount requires `LIVE_BREATHWORK_TRIAL_PRICE_APPROVED_IN_APP_CONFIG` before sandbox Price wiring; live Stripe objects stay deferred until sandbox E2E.
