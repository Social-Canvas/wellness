# Architecture Decision Log

Record significant technical decisions so future work (and AI tools) understand *why* things exist.

Format:

```
## YYYY-MM-DD — Decision title
**Decision:** What we chose
**Reason:** Why
**Alternatives considered:** What we rejected
**Status:** Accepted | Superseded | Pending
```

---

## 2026-06-28 — Modular monolith in Next.js (no Express)

**Decision:** Single Next.js 15 app with Server Actions and Route Handlers. No separate Express/Nest backend.

**Reason:** One deployment, lower cost, shared types, faster MVP. Express adds a second server with no meaningful benefit for this scope.

**Alternatives considered:** Express API, NestJS microservices, separate frontend/backend repos.

**Status:** Accepted

---

## 2026-06-28 — No Shopify

**Decision:** Build LMS/membership in Next.js + Stripe directly. Do not use Shopify.

**Reason:** ~90% of the product is membership, video, progress, and certificates — not ecommerce. Shopify would fight LMS requirements.

**Alternatives considered:** Shopify + apps, WooCommerce.

**Status:** Accepted

---

## 2026-06-28 — Mux for video (not Google Drive, Vimeo, YouTube)

**Decision:** All protected member video hosted and streamed via Mux with signed playback.

**Reason:** Signed URLs, adaptive streaming, playback tokens, no raw file exposure. Built for this use case.

**Alternatives considered:** Vimeo OTT, Cloudflare Stream, self-hosted HLS.

**Status:** Accepted

---

## 2026-06-28 — Stripe as payment source of truth

**Decision:** Stripe owns subscription/payment state. Local `subscriptions` and `purchases` tables mirror Stripe via webhooks.

**Reason:** Prevents payment drift, uses Stripe billing for upgrades/downgrades/cancellations, reduces PCI scope.

**Alternatives considered:** Store subscription state locally and sync periodically.

**Status:** Accepted

---

## 2026-06-28 — Stripe Customer Portal for billing changes

**Decision:** Use Stripe Customer Portal for upgrade, downgrade, and cancellation in MVP.

**Reason:** Less custom billing logic, Stripe handles proration, lower implementation risk.

**Alternatives considered:** Custom in-app billing UI with Stripe API.

**Status:** Accepted

---

## 2026-06-28 — Entitlement-based content access

**Decision:** `content_plan_access` table + centralized `entitlementService`. No hardcoded plan checks in components.

**Reason:** Maintainable as plans and content grow; supports upgrades/downgrades cleanly.

**Alternatives considered:** Plan tier numbers in code, feature flags per video.

**Status:** Accepted

---

## 2026-06-28 — Lazy Stripe customer creation

**Decision:** Create Stripe customer at first checkout, not at registration.

**Reason:** Avoids unnecessary Stripe records for casual registrants.

**Alternatives considered:** Eager creation on signup.

**Status:** Accepted

---

## 2026-06-28 — Database-backed jobs + Vercel Cron

**Decision:** `integration_jobs` table + `/api/cron/process-jobs` for retries (GHL, email, certificates).

**Reason:** Low cost, inspectable, sufficient for MVP scale. No queue service yet.

**Alternatives considered:** Inngest, Trigger.dev, QStash, Supabase Edge Functions queue.

**Status:** Accepted

---

## 2026-06-28 — GoHighLevel is non-blocking

**Decision:** Lead form submission succeeds even if GHL sync fails. Failed syncs logged and retried.

**Reason:** CRM downtime must not block lead capture.

**Alternatives considered:** Block form until GHL confirms.

**Status:** Accepted

---

## 2026-06-28 — Calendly remains scheduling source of truth

**Decision:** Embed/link Calendly for live class booking. No custom calendar in MVP.

**Reason:** Client already uses Calendly; building scheduling is out of scope.

**Alternatives considered:** Custom booking system, Calendly API deep sync.

**Status:** Accepted

---

## 2026-06-28 — Stripe promotion codes for coupons

**Decision:** Use Stripe Coupons/Promotion Codes for discount enforcement. Optional local metadata for admin display only.

**Reason:** Don't reinvent payment-level discount logic.

**Alternatives considered:** Custom coupon engine with local price calculation.

**Status:** Accepted

---

## 2026-06-28 — Server-first rendering

**Decision:** Default to Server Components. Client Components only for player, forms, interactive widgets.

**Reason:** Better security for protected data, less client JS, easier auth integration.

**Alternatives considered:** Client-heavy SPA within Next.js.

**Status:** Accepted

---

## 2026-06-28 — Feature-based folder structure

**Decision:** Organize by domain (`features/auth`, `features/billing`, etc.) not only by technical layer.

**Reason:** Clear boundaries, easier onboarding, possible future extraction.

**Alternatives considered:** Classic `components/`, `pages/`, `api/` only.

**Status:** Accepted

---

## 2026-06-28 — Design system from existing HTML template

**Decision:** Extract tokens and components from `Sample_Platform_Demo` HTML (~90% UI coverage).

**Reason:** Saves 12–18 hours of UI work; client-approved visual direction.

**Alternatives considered:** Build UI from scratch with Shadcn defaults only.

**Status:** Accepted

---

## 2026-06-28 — No refunds policy

**Decision:** No refund flows in product. Cancellation retains access until period end. Stripe disputes representable in DB if they occur.

**Reason:** Client business requirement.

**Alternatives considered:** Partial refund admin tool.

**Status:** Accepted

---

## 2026-06-28 — Webhook-granted access (not redirect-granted)

**Decision:** Subscription and product access granted only after Stripe webhook confirmation.

**Reason:** Redirect can be spoofed or arrive before webhook; Stripe is authoritative.

**Alternatives considered:** Grant on success URL with pending state.

**Status:** Accepted

---

## 2026-08-02 — Transactional email outbox on membership_lifecycle_events

**Decision:** Deliver membership and nonprofit seat emails via Resend using delivery columns on `membership_lifecycle_events` (not a separate delivery table, not marketing lists). Auth emails stay on Supabase Auth + optional Resend SMTP.

**Reason:** Lifecycle events already provide idempotent enqueue (`source_event_id` + `event_type`). Extending that table keeps claim/retry atomic and avoids dual writes. Capability grant/revoke flips are summarized inside membership emails instead of spamming per-capability mail.

**Alternatives considered:** Separate `email_deliveries` table; direct-only sends without outbox; SendGrid; marketing campaign tooling.

**Status:** Accepted

---

## 2026-08-03 — Membership recorded sessions as dedicated archive

**Decision:** Model ongoing Elevate membership recordings as `recorded_sessions` (not a finite course). Authorize via existing shared capability `session_replays` on effective membership (Core/Gold/Platinum, nonprofit-sponsored, complimentary). Do not grant access from Reset-only or ebook-only purchases. Link existing Mux assets idempotently; never re-upload when assets already exist.

**Reason:** Weekly archive is indefinite; course/module/lesson structure implies completion gates and finite outlines. `session_replays` already maps to all membership tiers without duplicate plan mappings or a new retail product.

**Alternatives considered:** Reuse `membership_course_library` course rows; add a new `recorded_sessions` capability; duplicate libraries per tier; create a Breathwork retail product.

**Status:** Accepted

---

## 2026-08-03 — Homepage video testimonials use public Mux + config

**Decision:** Host six portrait homepage testimonials on Mux with **public** playback IDs and a focused TypeScript config (`src/features/marketing-testimonials`), not the membership `videos` table / signed playback path. Upload via `scripts/upload-homepage-testimonials.mjs` with an explicit publication-permission flag. Keep source MP4s out of Git.

**Reason:** Marketing stories are not entitlement-gated. Reusing signed membership upload/webhook flows would conflate public homepage media with paid library assets and invite accidental locking. Config is enough for launch while display names, captions, and consent remain client-owned; admin DB management can follow later.

**Alternatives considered:** Store rows in `videos` with signed playback + anonymous tokens; add a testimonials CMS table now; third-party carousel library; commit MP4s to `public/`.

**Follow-up (2026-08-03):** Client confirmed publication permission ("I'm ok"). Six assets uploaded with public playback; config published with neutral "Member story" labels. Display names, roles, quotes, and captions still pending client metadata.

**Status:** Accepted

## 2026-08-03 — Hide Health Professional Session from public catalog

**Decision:** Mark `health-professional-session` product as `draft` and set marketing `publiclyVisible: false`. Exclude it from live Stripe activation inventory (`hidden — no live Checkout — no live Price`). Do not delete the product/course/media/Stripe test Price, and do not create a live Price. Keep the course published so entitled purchasers retain library access.

**Reason:** Session must not appear on Programs or enter live Checkout before go-live, while preserving catalog history and purchaser entitlements.

**Alternatives considered:** Soft-delete/archive product; draft the course container (would break entitled library access via published-only content queries); create a new `publicly_visible` DB column.

**Status:** Accepted

---

## 2026-08-03 — Align memberships + shared live sessions + Breathwork trial

**Decision:**
- Core/Gold/Platinum share `live_online_sessions` + `session_replays` (business alias: recorded_sessions). Gold/Platinum differ only by confirmed extras (`in_person_sessions`, `priority_support`). No duplicated live/recording content per plan.
- Nonprofit org Small/Mid/Large/Enterprise = `organizations.billing_tier` + seats only. Sponsored member content = Core-equivalent (`plan-1` capabilities) via individual accounts.
- Weekly Zoom sessions live in `live_classes` with Zoom URLs in `live_class_secrets` (service_role only). Participant links issued only after entitlement/trial registration checks.
- Live Breathwork public offer = one-time trial for one selected upcoming session (`live_session_registrations`), fulfilled via webhook metadata `purchase_type=live_session_trial` + `live_class_id`. No Member status, no recordings, no future sessions.
- Catalog trial amount remains $55; `LIVE_BREATHWORK_TRIAL_PRICE_APPROVED_IN_APP_CONFIG=false` until client confirms. No new live Stripe Prices/objects until sandbox E2E.
- Post-session feedback + membership CTA; lifecycle outbox events prepared (`live_trial_*`) without Kit marketing.

**Reason:** Matches final business model while extending existing capability, recorded-sessions, complimentary, and entitlement patterns.

**Alternatives considered:** Rename `session_replays` capability; duplicate recordings per tier; map nonprofit seat tiers to Gold/Platinum; store Zoom URLs on public `live_classes` rows.

**Status:** Accepted
