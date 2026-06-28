# AI Context — Online Yoga Membership Platform

Shared brain for Cursor, Claude, and ChatGPT. Read this before generating or modifying code.

## Project Overview

A paid membership platform for yoga video content with three subscription tiers, secure streaming, progress tracking, certificates, a digital product shop, live classes, lead capture, and an admin panel.

**MVP scope:** Auth, Stripe subscriptions (monthly/yearly), plan-based video access, Mux protected playback, member dashboard, progress/resume, certificates, shop, coupons, lead forms, GHL sync, Resend emails, basic admin, Calendly/Zoom links, migration of ~57 videos (~24 hrs).

**Out of scope for MVP:** Native apps, offline downloads, full DRM, community forum, assessments, advanced analytics, affiliate system, custom scheduling, multi-tenant.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 App Router, TypeScript |
| Styling | Tailwind CSS, Shadcn UI |
| Backend | Server Actions + Route Handlers (no Express) |
| Database / Auth / Storage | Supabase (PostgreSQL, Auth, Storage, RLS) |
| Payments | Stripe (subscriptions, one-time, coupons, portal) |
| Video | Mux (signed playback) |
| Email | Resend |
| Hosting | Vercel |
| CRM | GoHighLevel (webhooks) |
| Scheduling | Calendly + Zoom (external) |

## Architecture Principles

1. **Modular monolith** — one Next.js app, feature-based folders.
2. **Server-first** — Server Components by default; Client Components only when needed.
3. **Stripe owns payment truth** — local DB mirrors subscription state via webhooks.
4. **Centralized entitlements** — never hardcode plan access in UI.
5. **Mux owns video** — no raw files; signed short-lived playback tokens only.
6. **Webhooks are idempotent** — store provider event IDs before processing.
7. **Non-critical integrations must not block user flows** — GHL/email failures → retry jobs.

## Folder Structure

```
src/
  app/           # Routes, layouts, API Route Handlers
  components/    # Reusable UI (ui/, layout/, marketing/, dashboard/, admin/, video/, forms/)
  features/      # Domain modules (auth, billing, memberships, content, video, progress, etc.)
  lib/           # Provider clients, config, validation, errors, utils
  server/        # actions/, queries/, services/, jobs/, webhooks/
  types/         # database/, domain/, api/
supabase/        # Migrations, seed
docs/            # PRD, TDD, focused specs
```

## User Roles

| Role | Access |
|------|--------|
| Public visitor | Marketing, pricing, shop catalog, lead forms, auth pages |
| Authenticated user | Dashboard shell, account, purchases, free content |
| Active member | Plan-gated videos, progress, certificates, billing portal |
| Digital buyer | Purchased products only (separate from membership) |
| Admin | Content, products, leads, members, certificates |
| Super admin | Full admin + settings, roles, integrations |

## Database (Core Tables)

`profiles`, `plans`, `plan_prices`, `subscriptions`, `courses`, `content_collections`, `videos`, `course_videos`, `collection_videos`, `content_plan_access`, `video_progress`, `course_progress`, `certificates`, `products`, `product_files`, `purchases`, `leads`, `live_classes`, `webhook_events`, `integration_jobs`

## Authentication

- Supabase Auth (email/password, password reset).
- Server-side session via cookies; middleware refreshes sessions.
- Profile created on signup (`role` defaults to `user`).
- Stripe customer created **lazily** at first checkout.

## Authorization (Four Layers)

1. Route-level protection (middleware + layouts)
2. Server-side role checks (`admin`, `super_admin`)
3. Server-side entitlement checks (subscription + `content_plan_access` + purchases)
4. Supabase RLS on user-owned tables

**Active member** = derived from subscription status + `current_period_end` + `cancel_at_period_end`.

## API Conventions

- **Route Handlers:** webhooks, checkout/portal creation, playback tokens, download URLs, cron, public lead submit.
- **Server Actions:** profile updates, progress saves, admin CRUD, publish/unpublish.
- Never trust client-provided price, plan, product, role, or user ID.
- Return typed `{ success, data } | { success: false, error: { code, message } }`.

## Error Handling

Categories: `validation_error`, `authentication_required`, `authorization_failed`, `entitlement_required`, `not_found`, `payment_required`, `provider_error`, `rate_limited`, `unknown_error`.

User messages must be clear, short, non-technical. Log internals server-side only.

## Component Rules

- Prefer Server Components.
- No business logic in presentational components.
- Forms: React Hook Form + Zod.
- Shadcn UI for interactive primitives.
- Design tokens from sample HTML: cream `#F6FAF9`, blue `#2F7E96`, green `#5E8E74`, ink `#1F3A43`, fonts Poppins/Mulish.

## TypeScript Rules

- Strict mode, no `any` unless justified.
- DB types from Supabase codegen.
- Provider types isolated in `lib/`.

## Server Action Rules

Validate → authenticate → authorize → call service → revalidate → return result. No complex logic in the action itself.

## Security Rules

- Service role key, Stripe secret, Mux signing key, GHL token: **server-only**.
- Verify Stripe/Mux webhook signatures.
- Grant subscription/product access **only after webhook confirmation**, not redirect alone.
- Signed URLs for video playback and product downloads; short expiry.
- Rate-limit public forms.

## Environment Variables

**Public:** `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

**Server-only:** `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `MUX_TOKEN_ID`, `MUX_TOKEN_SECRET`, `MUX_SIGNING_KEY_ID`, `MUX_SIGNING_PRIVATE_KEY`, `RESEND_API_KEY`, `GHL_API_KEY`, `CRON_SECRET`

## Definition of Done

- [ ] Input validated (Zod)
- [ ] Auth + authorization checked server-side
- [ ] Types complete, no `any`
- [ ] Error states handled (loading.tsx, error.tsx where appropriate)
- [ ] No secrets in client bundle
- [ ] RLS policies for new user-owned tables
- [ ] Webhook handlers idempotent
- [ ] Manual test path documented

## Testing Conventions

- Test entitlement logic, webhook idempotency, and access denial paths.
- Verify each plan's content access before launch.
- Migration: verify all 57 videos (metadata, playback, plan assignment).

## AI Workflow

| Tool | Role |
|------|------|
| ChatGPT | Architecture, schema review, planning, code review |
| Claude | Generate complete feature modules from specs |
| Cursor | Integrate, refactor, convert HTML → React, fix errors |

**Prompt prefix:** "Follow AI_CONTEXT.md and PROJECT_RULES.md. [specific task]"
