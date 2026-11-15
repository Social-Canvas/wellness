# Client action tracker

Source: the Technical Action Tracker spreadsheet, gid 0, read in full on 15 Nov 2026. No other worksheet tab was exposed by the public export.

| ID | Classification | This pass |
|---|---|---|
| FIX-01 GTM events | Done in the current branch | Container `GTM-54JKK6HG`. Events `signup`, `lead`, `begin_checkout`, `purchase`. No second GA4 snippet. |
| FIX-02 Bot protection | Done in the current branch | Honeypot, durable rate limits, spam fingerprint, optional Turnstile. 44 historical retreat leads can be flagged by migration. Accounts are not bulk-flagged. |
| FIX-03 Email deliverability | Handoff / configuration | DNS report only. No DNS or sender change. |
| FIX-04 Super admin for both Ritika emails | Already done | Both accounts already have `super_admin`. |
| FIX-05 Credentials for every service | Handoff / configuration | Names and access matrix only. No passwords or key values. |
| PRE-01 Live Reset purchase test | Needs confirmation | A live card test is a client call, not a code change. |
| PRE-02 Upload remaining Reset assets | Needs confirmation | Admin can upload PDFs and edit course text. Mux video files still go through the existing video admin. |
| PRE-03 Remove live classes from Gold and VIP form destination | Needs confirmation | Gold copy is now editable. Entitlements are not changed here. |
| PRE-04 Admin 503s | Needs confirmation | Not reproduced in this pass. |
| PRE-05 Refund policy, terms, cookie banner | Needs confirmation | Legal copy was not invented. Privacy link already exists. |
| LND-01 Dedicated /reset landing page | Future scope | Not built. |
| LND-02 Guest checkout | Future scope | Checkout still uses the current account flow. |
| LND-03 Reset page Meta/Pixel events | Future scope | Depends on the page that was not built. GTM covers the existing site. |
| LND-04 Delivery date | Needs confirmation | Commercial, not engineering. |
| SGN-01 Name and email only | Future scope | Signup fields were not reduced in this pass. |
| SGN-02 Google sign-in | Future scope | Not built. |
| SGN-03 100% promo for testimonials | Future scope | Complimentary grants already exist for staff. A public promo engine was not added. |
| SGN-04 Corporate promo redemption caps | Future scope | Nonprofit access codes already exist. A new promo engine was not added. |
| TRK-01 Meta Pixel and CAPI | Future scope | Needs the client's Meta access. GTM can hold a browser tag later. |
| TRK-02 Event dedupe and value | Done for purchase | Purchase dedupes on the Stripe checkout session and sends value and currency. No PII. |
| TRK-03 Persist UTMs | Future scope | Not stored in this pass. |
| TRK-04 Membership revenue widget | Done with a limit | Admin dashboard shows one-time revenue. Renewal revenue stays in Stripe. |
| OPS-01 GitHub access | Handoff / configuration | Repo is `Social-Canvas/wellness`. Invite from GitHub. Not done here. |
| OPS-02 Vercel access | Handoff / configuration | Invite from Vercel. Not done here. |
| OPS-03 Env var documentation | Done | Names only, in `docs/HANDOFF.md` and Admin → Settings for super admins. |
| OPS-04 Database access | Handoff / configuration | Supabase invite. Not done here. |
| OPS-05 Preview deployments | Handoff / configuration | Vercel already builds previews from Git. No new pipeline. |
| DOC-01 Loom videos | Handoff / configuration | A person should record the admin walkthrough. |
| DOC-02 Code vs admin matrix | Done | See the handoff report and Admin → Content. |
| DOC-03 Image specs | Done | JPEG, PNG, WebP, or GIF, 5 MB, with alt text. PDFs up to 50 MB in the private product bucket. |
| DSN-01 Theme tokens | Already done | Tailwind tokens already exist. No new theme system. |
| DSN-02 Editable hero | Done | Admin → Content. |
| DSN-03 New visual refresh | Future scope | Wait for the design files. |
| ALN-01 Deadlines | Needs confirmation | Commercial. |
| ALN-02 Scope boundary | Done | This tracker is the boundary. |
| ALN-03 Test login with Reset access | Needs confirmation | Do not share a production password from the repo. A future test-account mode is documented only. |
