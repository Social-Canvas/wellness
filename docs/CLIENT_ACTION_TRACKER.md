# Client action tracker

Source: the client's Technical Action Tracker sheet, Detailed Backlog tab (36 rows). The sheet is not writable from engineering sessions, so this file is the source of the status text to paste back.

Count after the 24 Nov 2026 internal batch: 22 of 36 completed (61%). 5 more are engineering-side actions (FIX-05, SGN-02, OPS-04, LND-04, ALN-01), which would bring it to 27 of 36 (75%). 9 need the client.

The sheet's own summary still showed 9 of 36 before this update because rows had not been marked.

| ID | Status | Notes |
|---|---|---|
| FIX-01 GTM events | Completed | Container `GTM-54JKK6HG`. Events `signup`, `lead`, `view_item`, `begin_checkout`, `purchase`. No second GA4 snippet. |
| FIX-02 Bot protection | Completed | Honeypot, durable rate limits, spam fingerprint, optional Turnstile. |
| FIX-03 Email deliverability | Blocked on client | GoDaddy DNS. Apex SPF is still `v=spf1 include:secureserver.net -all`, DMARC `p=none`, no `send` return-path. Exact records in `docs/EMAIL_DELIVERABILITY.md`. DNS was not changed. |
| FIX-04 Super admin for both Ritika emails | Completed | Both accounts have `super_admin` and have signed in. |
| FIX-05 Credentials for every service | Engineering action | Ownership table of each service and who holds the login. Names only, no passwords or keys. Owners of Stripe, Mux, Resend, Kit, and GTM still to confirm. |
| PRE-01 Live Reset purchase test | Blocked on client | Needs a real $47 card test on a call. The path, including guest checkout and the password-setup email, is built. No card was charged. |
| PRE-02 Upload remaining Reset assets | Blocked on client | 22 published Reset lessons with video. Missing: journal, grocery list, quiz PDFs. |
| PRE-03 Gold live classes and VIP form | Blocked on client | Core still includes live access, so removing live classes from Gold makes Gold weaker than Core. Needs a decision. |
| PRE-04 Admin 503s | Completed | Not reproduced. |
| PRE-05 Refund policy, terms, cookie banner | Blocked on client | `/terms`, `/refund`, and the cookie banner are live. Approved legal wording is still needed. |
| LND-01 Dedicated /reset page | Blocked on client | `/reset` is live and `/reset-` and `/reset-plan` redirect to it. Waiting on the Stan Store reference for layout. |
| LND-02 Guest checkout | Completed | Logged-out Reset purchase opens Stripe. The account is created from the checkout email and a password-setup email is sent. |
| LND-03 Reset page Meta/Pixel events | Blocked on client | `/reset` now pushes `view_item` (ViewContent) to the dataLayer. The Meta Pixel tag needs Meta access. |
| LND-04 Delivery date | Engineering action | Propose a date. |
| SGN-01 Name and email only | Completed 24 Nov 2026 | Signup is now name, email, password. No certificate name, no confirm password, and no certificate-name screen before the dashboard while certificates are hidden. |
| SGN-02 Google sign-in | Engineering action | Button and callback built, hidden until enabled. Needs a Google OAuth client entered in Supabase. See `docs/GOOGLE_SIGN_IN.md`. |
| SGN-03 100% promo for testimonials | Completed 24 Nov 2026 | Product checkout accepts Stripe promotion codes. A 100%-off code grants access as a $0 order that is not counted as revenue. Admin → Members also grants complimentary Reset access. |
| SGN-04 Corporate promo redemption caps | Completed 24 Nov 2026 | Stripe promotion codes support max redemptions, expiry, and first-time-only. Organization access codes also have seat limits and expiry. |
| TRK-01 Meta Pixel and CAPI | Blocked on client | Needs Meta Business access. |
| TRK-02 Event dedupe and value | Completed | Purchase dedupes on the checkout session and sends value and currency. No PII. |
| TRK-03 Persist UTMs | Completed | First-touch UTMs persist 30 days and are copied to leads, signup, and Stripe metadata. |
| TRK-04 Membership revenue widget | Completed 24 Nov 2026 | Admin dashboard shows active memberships and monthly recurring revenue from current subscription prices (yearly divided by 12). Complimentary and sponsored seats are excluded. Collected renewals stay in Stripe. |
| OPS-01 GitHub access | Blocked on client | Repo `Social-Canvas/wellness`. Needs Ritika's GitHub username to invite. |
| OPS-02 Vercel access | Completed (owner decision) | Vercel stays with Social Canvas. Deploy status is visible through GitHub. Revisit if hosting ownership moves. |
| OPS-03 Env var documentation | Completed | Names only, in `docs/HANDOFF.md` and Admin → Settings. |
| OPS-04 Database access | Engineering action | Invite elevate.ritika@gmail.com to the Supabase project. |
| OPS-05 Preview deployments | Completed | Vercel builds previews from Git. |
| DOC-01 Loom videos | Completed 24 Nov 2026 | Screenshot guide in `docs/operator-guide/README.md`, with the written guide in `docs/OPERATOR_GUIDE.md`. A recorded Loom is optional. |
| DOC-02 Code vs admin matrix | Completed | Handoff report and Admin → Content. |
| DOC-03 Image specs | Completed 24 Nov 2026 | `docs/MEDIA_SPECS.md`: image formats, size limit, crop shapes, PDF limit, and recommended video settings. |
| DSN-01 Theme tokens | Completed | Tailwind tokens exist. |
| DSN-02 Editable hero | Completed | Admin → Content. |
| DSN-03 Visual refresh | Completed (ready for mockups) | Tokens and editable hero are in place. The redesign itself is new work when mockups arrive. |
| ALN-01 Deadlines | Engineering action | Propose dates. |
| ALN-02 Scope boundary | Completed | This tracker. |
| ALN-03 Test login with Reset access | Completed | Audited: 1 free claim, 1 complimentary grant, 0 paid orders, 0 paid subscriptions. Complimentary Reset access is granted from Admin → Members. No password was shared. |

## Phase 1 rows (ours, not on the client sheet)

| ID | Status | Notes |
|---|---|---|
| PH1-01 Admin login | Completed | `elevate.ritika@gmail.com`, `ritika.bizz@gmail.com`, and `deevanshu.kumawat@gmail.com` are `super_admin`. Passwords were not reset. |
| PH1-02 Library 404 | Completed | `/library` redirects to `/dashboard/library`. |
| PH1-03 Certificates hidden | Completed | Removed from navigation, dashboard, and signup. A direct certificate URL says certificates are not offered. |
| PH1-04 Live Breathwork $55 purchase | Blocked on client | Opens when a published trial session has a real future date. |
| PH1-05 Super admin demo access | Completed | Stored `super_admin` role opens all published content without a purchase. |
| PH1-06 First recorded session | Blocked on client if the Drive file is new | Four recordings are published. See `docs/RECORDED_SESSION_WORKFLOW.md`. |
| PH1-07 Admin session management | Completed | Recorded and live sessions can be created, edited, published, and unpublished. |
| PH1-08 End-to-end member access | Completed | Admin, library, course, lesson video, recordings, downloads, and live sessions checked on production. |
