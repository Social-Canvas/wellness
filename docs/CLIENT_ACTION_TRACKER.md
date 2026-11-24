# Client action tracker

Source: the Technical Action Tracker spreadsheet, gid 0, read in full on 15 Nov 2026. No other worksheet tab was exposed by the public export. The Google Sheet was not writable from this session. This file is the updated tracker.

Phase 2 count on 24 Nov 2026: 44 total, 22 completed, 0 in progress, 12 blocked on client action, 10 still need a commercial or access confirmation. Completion is 50%. Guide-ready, payment-authorization, and hidden-button rows are not counted as completed.

| ID | Classification | This pass |
|---|---|---|
| FIX-01 GTM events | Done in the current branch | Container `GTM-54JKK6HG`. Events `signup`, `lead`, `begin_checkout`, `purchase`. No second GA4 snippet. |
| FIX-02 Bot protection | Done in the current branch | Honeypot, durable rate limits, spam fingerprint, optional Turnstile. 44 historical retreat leads can be flagged by migration. Accounts are not bulk-flagged. |
| FIX-03 Email deliverability | BLOCKED — CLIENT ACTION REQUIRED | Re-checked 24 Nov 2026. DNS was not changed. Apex SPF is still `v=spf1 include:secureserver.net -all`. DMARC is `p=none`. Resend DKIM exists. No `send` return-path. Microsoft 365 MX does not match the SPF. Exact records remain in `docs/EMAIL_DELIVERABILITY.md`. |
| FIX-04 Super admin for both Ritika emails | Already done | Both accounts already have `super_admin`. |
| FIX-05 Credentials for every service | Handoff / configuration | Names and access matrix only. No passwords or key values. |
| PRE-01 Live Reset purchase test | REAL PAYMENT TEST AUTHORIZATION REQUIRED | Technical path is in place: `/reset` to checkout to Stripe payment session to `checkout.session.completed` to order, order item, and course access through `products.granted_course_id`. Amount is $47.00 (4700 cents, one-time). No card was charged. |
| PRE-02 Upload remaining Reset assets | BLOCKED — CLIENT ACTION REQUIRED | 22 published lessons with videos are already in the Reset course. Missing client files: Reset journal, grocery list, quiz, and any other downloadable Reset PDFs. Do not invent them. |
| PRE-03 Remove live classes from Gold and VIP form destination | Needs confirmation | Gold copy is now editable. Entitlements are not changed here. |
| PRE-04 Admin 503s | Needs confirmation | Not reproduced in this pass. |
| PRE-05 Refund policy, terms, cookie banner | BLOCKED — CLIENT ACTION REQUIRED | `/terms` and `/refund` exist and are linked from the footer. They state that approved copy is not on file. Cookie choice is recorded for GTM. Approved legal text is still required. |
| LND-01 Dedicated /reset landing page | Completed 24 Nov 2026 | `/reset` is the canonical page. `/reset-` and `/reset-plan` redirect there. CTA continues into Reset checkout. |
| LND-02 Guest checkout | Completed 24 Nov 2026 | A logged-out Reset purchase can open Stripe Checkout. The account is created or matched from the paid checkout email. No temporary password is shown. Membership checkout still requires an account. |
| LND-03 Reset page Meta/Pixel events | BLOCKED — CLIENT ACTION REQUIRED | GTM is on `/reset`. Meta Pixel and CAPI still need the client's Meta access. |
| LND-04 Delivery date | Needs confirmation | Commercial, not engineering. |
| SGN-01 Name and email only | Completed as a business-rule review 24 Nov 2026 | Signup already asks for name, email, password, and password confirmation. The locked certificate name is an existing irreversible business rule, so it stays on signup. |
| SGN-02 Google sign-in | BLOCKED — CLIENT ACTION REQUIRED | The button and callback are implemented and stay hidden until `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`. Google client ID and secret must be entered in Supabase. See `docs/GOOGLE_SIGN_IN.md`. |
| SGN-03 100% promo for testimonials | Completed 24 Nov 2026 | Admin → Members can grant or revoke complimentary Reset access. No paid order is created. |
| SGN-04 Corporate promo redemption caps | Completed by verification 24 Nov 2026 | Organization access codes already support a configurable code, seat limit, expiry, and one seat per member. No second promo system was added. |
| TRK-01 Meta Pixel and CAPI | BLOCKED — CLIENT ACTION REQUIRED | Needs the client's Meta access. GTM can hold a browser tag later. |
| TRK-02 Event dedupe and value | Done for purchase | Purchase dedupes on the Stripe checkout session and sends value and currency. No PII. |
| TRK-03 Persist UTMs | Completed 24 Nov 2026 | First-touch `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, and `utm_term` persist for 30 days and are copied onto leads, signup metadata, and Stripe Checkout metadata. |
| TRK-04 Membership revenue widget | Done with a limit | Admin dashboard shows one-time revenue, transactions, and membership export. Renewal revenue stays in Stripe. No MRR figure was added. |
| OPS-01 GitHub access | BLOCKED — CLIENT ACTION REQUIRED | Repo is `Social-Canvas/wellness`. Invite from GitHub. Not done here. |
| OPS-02 Vercel access | BLOCKED — CLIENT ACTION REQUIRED | Invite from Vercel. Not done here. |
| OPS-03 Env var documentation | Done | Names only, in `docs/HANDOFF.md` and Admin → Settings for super admins. |
| OPS-04 Database access | BLOCKED — CLIENT ACTION REQUIRED | Supabase invite. Not done here. |
| OPS-05 Preview deployments | Handoff / configuration | Vercel already builds previews from Git. No new pipeline. |
| DOC-01 Loom videos | Guide ready 24 Nov 2026 | `docs/OPERATOR_GUIDE.md` is the script. A person still has to record the Loom. |
| DOC-02 Code vs admin matrix | Done | See the handoff report and Admin → Content. |
| DOC-03 Image specs | Done | JPEG, PNG, WebP, or GIF, 5 MB, with alt text. PDFs up to 50 MB in the private product bucket. |
| DSN-01 Theme tokens | Already done | Tailwind tokens already exist. No new theme system. |
| DSN-02 Editable hero | Done | Admin → Content. |
| DSN-03 New visual refresh | Future scope | Wait for the design files. |
| ALN-01 Deadlines | Needs confirmation | Commercial. |
| ALN-02 Scope boundary | Done | This tracker is the boundary. |
| ALN-03 Test login with Reset access | Needs confirmation | Do not share a production password from the repo. A future test-account mode is documented only. |
| PH1-01 Admin login | Ready for client sign-in | Production `/admin` stays signed in after refresh for an existing super admin session. `elevate.ritika@gmail.com`, `ritika.bizz@gmail.com`, and `deevanshu.kumawat@gmail.com` are `super_admin`. Their passwords were not reset. If sign-in says the email or password is invalid, use https://elevate-healthsolutions.com/forgot-password and then open `/login?next=%2Fadmin`. |
| PH1-02 Library 404 | Completed | `/library` redirects to `/dashboard/library`. My Library opened on production. |
| PH1-03 Certificates hidden | Completed | Removed from member navigation and the dashboard home. A direct certificate URL says certificates are not currently offered. |
| PH1-04 Live Breathwork $55 purchase | BLOCKED — CLIENT ACTION REQUIRED | The purchase stays unavailable until a published future trial session exists. Production has no live session rows. Admin → Live Sessions can create one. No date was invented and no payment was created. Target remains the real session date the client supplies. |
| PH1-05 Super admin full demo access | Completed | A profile whose stored role is `super_admin` can open published courses, lessons, videos, downloads, recorded sessions, and membership content without a new Stripe purchase. Normal members still need their own entitlement. |
| PH1-06 First recorded session | BLOCKED — CLIENT ACTION REQUIRED if the Drive file is new | Google Drive is not synced. See `docs/RECORDED_SESSION_WORKFLOW.md`. Production already shows four published recordings: Inner Child Healing, Manifestation Breathwork, Trauma Healing, and Visualization. |
| PH1-07 Admin session management | Completed for the existing admin screens | Recorded sessions can be added, edited, published, and unpublished. Live sessions can be drafted with date, time, Zoom URLs, and the trial checkbox, then edited or unpublished. No second CMS was added. |
| PH1-08 End-to-end member access | Completed for the signed-in super admin | Production path checked: admin, My Library, course, lesson video, recorded session playback, downloads, and the live sessions page. A normal user without an entitlement is still denied by the existing rules. |
