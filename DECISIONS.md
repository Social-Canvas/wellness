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
