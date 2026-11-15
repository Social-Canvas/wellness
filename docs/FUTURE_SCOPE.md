# Future scope

This is not built. Stripe and the website stay the commerce authority. Kit is not a second payment system.

## Supported today

- Public pages, programs, memberships, one-time products, and checkout through Stripe.
- Entitlements after the Stripe webhook, not after the success redirect.
- Explicit marketing consent synced to Kit when `KIT_SYNC_ENABLED=true` and `KIT_API_KEY` is set. The newsletter form id must be copied from Kit. It is blank in `.env.example` until confirmed.
- Live sessions and recorded sessions in admin, with Zoom or Calendly links stored for sessions that already exist.
- Admin content for wording and images. Prices, slugs, and Stripe IDs stay locked after creation.

## Easy next integration

- Turnstile keys in the hosting environment. The fields already render when both keys exist and stay off when they do not.
- Confirm the Kit form id, then enable sync in production only.
- Finish Resend `send` DNS and then consider `hello@` as From.
- Invite `elevate.ritika@gmail.com` to GitHub, Vercel, Supabase, Stripe, Resend, and GoDaddy. Do not send passwords or API keys.

## Future product scope

- Free events, paid events, event date and time, Zoom links for events, registration, and reminder automation as a new event model. Do not overload live-session membership quotas to fake this.
- Referral programs.
- Kit sending data back into the website.
- Purchases that start in Kit and need website entitlements. That needs a signed webhook and the same entitlement service. It is not a second source of payment truth.
- A test-account mode. Do not add a permanent paid staging project. A future `account_mode` of `production` or `test` can grant simulated entitlements for dashboard, course, download, certificate, and live-session UI checks. Test accounts must be labeled and excluded from sales metrics. They must not charge Stripe, sync Kit, or fire production GTM conversions. Do not switch the live Stripe secret key because a user is an admin. Stripe test mode stays on local development or a short-lived preview.

## Client sheet items left out on purpose

See `docs/CLIENT_ACTION_TRACKER.md`. Guest checkout, a separate Reset landing page, Google sign-in, Meta CAPI, corporate promo limits, and a visual rebuild are new product scope.
