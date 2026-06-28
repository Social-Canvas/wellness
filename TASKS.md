# Tasks — MVP Implementation Checklist

Track progress sprint by sprint. Each task should be independently testable when marked done.

---

## Sprint 0 — Foundation

- [ ] Copy PRD and TDD into `docs/` (PRD.md, TDD.md)
- [ ] Copy sample HTML to `docs/reference/Sample_Platform_Demo.html`
- [ ] Configure environment validation (`lib/config` + `.env.example`)
- [ ] Configure Tailwind with design tokens from HTML (cream, blue, green, ink, Poppins/Mulish)
- [ ] Initialize Shadcn UI
- [ ] Set up Supabase project + local connection
- [ ] Configure ESLint + Prettier + Husky + lint-staged
- [ ] Create feature folder scaffold (`src/features/`, `src/server/`, `src/lib/`)
- [ ] Deploy empty preview to Vercel
- [ ] Document env vars in README

**Definition of done:** App runs locally, preview deploys, design tokens in Tailwind, docs in place.

---

## Sprint 1 — Design System & Layout

- [ ] Extract typography, colors, spacing from HTML → `docs/DESIGN_SYSTEM.md`
- [ ] Build `Button`, `Input`, `Label`, `Card`, `Badge`, `Modal`, `Tabs`, `Accordion`
- [ ] Build `Navbar`, `Footer`, `Sidebar`, `PageHeader`
- [ ] Build marketing sections: `Hero`, `PricingTiers`, `Testimonials`, `FAQ`, `CaptureForm`
- [ ] Build dashboard widgets: `ProgressBar`, `CourseCard`, `VideoCard`, `PlanBadge`
- [ ] Build admin table/form primitives
- [ ] Create route group layouts: `(public)`, `(auth)`, `(dashboard)`, `(admin)`

**Definition of done:** Component inventory matches HTML; pages can be assembled from components with mock data.

---

## Sprint 2 — Auth & Profiles

- [ ] Supabase Auth: register, login, logout, forgot password, reset password
- [ ] Middleware: session refresh, protected route redirects
- [ ] `profiles` table + auto-create on signup
- [ ] Login, register, forgot-password, reset-password pages
- [ ] Dashboard shell layout (authenticated, no entitlement yet)
- [ ] Account settings page (name, email display)
- [ ] Role field on profile (`user`, `admin`, `super_admin`)

**Testing:** Unauthenticated users redirected from `/dashboard`. Password reset flow works.

---

## Sprint 3 — Database Schema & RLS

- [ ] Migration: `plans`, `plan_prices`, `subscriptions`
- [ ] Migration: `courses`, `content_collections`, `videos`, mapping tables
- [ ] Migration: `content_plan_access`
- [ ] Migration: `video_progress`, `course_progress`
- [ ] Migration: `certificates`, `products`, `product_files`, `purchases`
- [ ] Migration: `leads`, `live_classes`, `webhook_events`, `integration_jobs`
- [ ] RLS policies on user-owned tables
- [ ] Seed: three plans + placeholder Stripe price IDs
- [ ] Generate TypeScript types from schema

**Testing:** RLS prevents cross-user data access.

---

## Sprint 4 — Memberships & Stripe

- [ ] Pricing page with three plans (monthly/yearly toggle)
- [ ] `POST /api/stripe/checkout` — subscription checkout
- [ ] `POST /api/stripe/portal` — customer portal
- [ ] `POST /api/stripe/webhook` — signature verify + idempotent processing
- [ ] Handle: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
- [ ] `entitlementService` — `canAccessVideo`, `canAccessCourse`, `getActivePlan`
- [ ] Sync subscription state to `subscriptions` table
- [ ] Billing page with portal link
- [ ] No-refund policy visible before checkout
- [ ] Confirmation email on subscription (Resend)

**Testing:** Subscribe → webhook → dashboard shows plan. Cancel → access until period end.

---

## Sprint 5 — Content & Video (Mux)

- [ ] Mux client setup (upload, asset status)
- [ ] `POST /api/mux/webhook` — processing status updates
- [ ] `POST /api/mux/playback-token` — entitlement check + signed token
- [ ] Video player component (Mux player, Client Component)
- [ ] Course/video listing pages (plan-filtered)
- [ ] Video detail page with lesson list sidebar
- [ ] Locked content UI with upgrade prompt
- [ ] Admin: video upload workflow (Mux direct upload)
- [ ] Admin: assign video to plans/courses/collections
- [ ] Admin: publish/unpublish/schedule

**Testing:** Authorized user plays video. Unauthorized gets 403. Shared token expires/denied.

---

## Sprint 6 — Progress & Resume

- [ ] `saveVideoProgress` Server Action (throttled, ~20s intervals)
- [ ] Save on pause/unload where reliable
- [ ] Completion detection (configurable threshold, default 90%)
- [ ] Course progress rollup (`course_progress`)
- [ ] Dashboard: recently watched, progress bars, % complete
- [ ] Resume: set `currentTime` from `last_position_seconds`
- [ ] Admin: high-level completion visibility

**Testing:** Watch partial → leave → return → resumes. Complete threshold marks done.

---

## Sprint 7 — Certificates

- [ ] `certificateService` — eligibility check, duplicate prevention
- [ ] Auto-issue on course completion (via job queue)
- [ ] `certificates` table with unique `certificate_number` + `verification_token`
- [ ] Dashboard certificates list
- [ ] Public verification page `/certificate/[token]`
- [ ] PDF generation (pdf-lib) → Supabase Storage (optional MVP)
- [ ] Certificate issued email (Resend)

**Testing:** Complete course → certificate appears. No duplicates. Verification URL works.

---

## Sprint 8 — Shop & Digital Products

- [ ] Shop catalog page (public)
- [ ] Product detail page
- [ ] Stripe Checkout for one-time products
- [ ] Webhook: create/update `purchases` on payment success
- [ ] Dashboard: purchased products list
- [ ] `POST /api/products/download-url` — signed Supabase URL
- [ ] Admin: CRUD products + file upload to private bucket
- [ ] Purchase confirmation email

**Testing:** Buy ebook → appears in dashboard → download works → non-buyer denied.

---

## Sprint 9 — Coupons

- [ ] Stripe promotion codes in checkout flow
- [ ] Coupon input on pricing/checkout UI
- [ ] Admin: view/reference Stripe coupons
- [ ] Clear error for invalid/expired/limited coupons

**Testing:** Valid code applies discount. Invalid rejected with message.

---

## Sprint 10 — Lead Forms

- [ ] VIP enquiry form (`/vip`)
- [ ] Retreat enquiry form (`/retreats`)
- [ ] Private event form (`/private-events`)
- [ ] Free taster form (`/free-taster`)
- [ ] `POST /api/leads/submit` — validate, rate-limit, store
- [ ] Admin notification email
- [ ] User confirmation email
- [ ] GHL sync job (enqueue, non-blocking)
- [ ] Admin: leads list with sync status

**Testing:** Form submits → stored → email sent. GHL failure still shows success to user.

---

## Sprint 11 — GoHighLevel Integration

- [ ] GHL client in `lib/ghl/`
- [ ] Sync lead on submission
- [ ] Sync lifecycle events: registration, purchase, cancellation (optional MVP)
- [ ] Retry failed syncs via `integration_jobs`
- [ ] Admin visibility of sync status per lead

**Testing:** Lead appears in GHL. Retry works after simulated failure.

---

## Sprint 12 — Live Classes

- [ ] Live classes listing page
- [ ] Calendly embed/link per class
- [ ] Member-only gating where configured
- [ ] Admin: CRUD live class metadata
- [ ] Free taster booking path (public Calendly)

**Testing:** Member-only class hidden from non-members. Calendly opens correctly.

---

## Sprint 13 — Admin Panel

- [ ] Admin layout with role guard
- [ ] Admin dashboard (summary counts)
- [ ] Admin: videos, courses, products, members, leads, certificates
- [ ] Admin: subscription status per member
- [ ] Admin: migration status view for 57 videos
- [ ] Admin: publish weekly content workflow

**Testing:** Non-admin gets 403 on `/admin`. Admin CRUD works end-to-end.

---

## Sprint 14 — Video Migration

- [ ] Migration inventory spreadsheet/checklist
- [ ] Bulk upload script or Mux dashboard workflow
- [ ] Track `migration_status` per video
- [ ] Verify metadata: title, duration, thumbnail, plan access
- [ ] QA playback + access control per video
- [ ] Flag missing metadata before launch

**Testing:** All 57 videos play with correct plan restrictions.

---

## Sprint 15 — Email & Cron

- [ ] Resend client + email templates
- [ ] Transactional emails: subscription, cancellation, purchase, lead, certificate
- [ ] `GET /api/cron/process-jobs` — batch processor with `CRON_SECRET`
- [ ] Vercel Cron schedule for job processing
- [ ] Job retry with exponential backoff

**Testing:** Failed GHL/email jobs retry and complete.

---

## Sprint 16 — Launch Readiness

- [ ] Security review checklist (TDD §27)
- [ ] All env vars configured in production
- [ ] Stripe webhooks pointed to production
- [ ] Mux webhooks pointed to production
- [ ] Resend domain verified
- [ ] Mobile responsive QA on core pages
- [ ] Load test entitlement checks
- [ ] User acceptance testing with client
- [ ] Backup/rollback procedure documented

**Launch criteria (from PRD §15):** All 57 videos migrated, billing flows tested, access control verified, admin can publish content, emails deliver, no-refund policy visible.

---

## Post-MVP (Future)

- [ ] Advanced analytics dashboard
- [ ] Calendly webhook → internal booking sync
- [ ] PDF certificates with LinkedIn share optimization
- [ ] DRM / watermarking / concurrent stream limits
- [ ] MFA for admin users
- [ ] Sentry error monitoring
