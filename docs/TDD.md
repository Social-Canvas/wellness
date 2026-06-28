# Technical Design Document

## Online Yoga Membership Platform

Version: 1.0
Stack: Next.js 15, TypeScript, Tailwind CSS, Shadcn UI, Supabase, Stripe, Mux, Vercel, Resend, Calendly, Zoom, GoHighLevel

---

# 1. Technical Overview

The platform will be built as a server-first Next.js 15 application using the App Router. The architecture will be a modular monolith, deployed on Vercel, with Supabase acting as the primary backend platform for authentication, PostgreSQL database, and private file storage.

The application should not start with a separate custom backend service. Next.js Route Handlers and Server Actions are sufficient for the MVP and keep infrastructure simple, low-cost, and maintainable.

External systems will be used for specialized responsibilities:

* Supabase Auth for authentication.
* Supabase PostgreSQL for application data.
* Supabase Storage for secure digital files and certificates.
* Stripe for subscriptions, one-time purchases, coupons, invoices, and customer portal.
* Mux for secure video hosting and streaming.
* Resend for transactional emails.
* Calendly and Zoom for live class scheduling and meetings.
* GoHighLevel for CRM and lead automation.
* Vercel for hosting, deployments, logs, cron jobs, and observability.

The core architectural principle is:

> The application owns access control, user experience, and business workflows. External providers own payments, video streaming, scheduling, email delivery, and CRM automation.

---

# 2. High-Level Architecture

## 2.1 Logical System Diagram

```text
User Browser
   |
   | HTTPS
   v
Next.js 15 App Router on Vercel
   |
   |-- Public Marketing Pages
   |-- Auth Pages
   |-- Member Dashboard
   |-- Admin Panel
   |-- Server Actions
   |-- Route Handlers
   |
   |-------------------- Supabase Auth
   |-------------------- Supabase PostgreSQL
   |-------------------- Supabase Storage
   |-------------------- Stripe
   |-------------------- Mux
   |-------------------- Resend
   |-------------------- Calendly
   |-------------------- Zoom
   |-------------------- GoHighLevel
```

## 2.2 Core Runtime Responsibilities

### Next.js

Responsible for:

* Rendering public pages.
* Rendering authenticated member dashboard pages.
* Rendering admin pages.
* Handling form mutations through Server Actions.
* Handling external provider callbacks through Route Handlers.
* Performing server-side authorization.
* Generating signed video playback access.
* Generating signed digital product download access.

### Supabase

Responsible for:

* User authentication.
* User profile data.
* Membership state mirror.
* Entitlement data.
* Content metadata.
* Progress tracking.
* Certificate records.
* Digital product purchase records.
* Lead submissions.
* Private file storage.
* Row-level security.

### Stripe

Responsible for:

* Hosted checkout.
* Recurring subscriptions.
* Monthly and yearly pricing.
* Upgrades and downgrades.
* Cancellations.
* Coupons and discounts.
* One-time digital product payments.
* Customer portal.
* Payment and subscription lifecycle events.

### Mux

Responsible for:

* Hosting video assets.
* Processing uploaded videos.
* Secure video playback.
* Signed playback access.
* Video thumbnails and duration metadata.
* Playback readiness events.

### Resend

Responsible for:

* Transactional emails.
* Lead confirmations.
* Admin notifications.
* Purchase confirmations.
* Certificate notifications.

### Calendly and Zoom

Responsible for:

* Live class scheduling.
* Booking workflows.
* Zoom meeting links.
* Confirmation and reminder workflows.

### GoHighLevel

Responsible for:

* CRM lead capture.
* Marketing automation.
* Sales pipeline workflows.
* Follow-up sequences.

---

# 3. Architectural Decisions

## 3.1 Modular Monolith

The system will use a modular monolith architecture inside one Next.js application.

Chosen because:

* Simpler to build and deploy.
* Lower infrastructure cost.
* Easier local development.
* Easier shared type safety.
* Faster MVP delivery.
* No need for premature microservices.

Avoid for MVP:

* Separate Express/Nest backend.
* Microservices.
* Event bus infrastructure.
* Custom video server.
* Custom payment engine.
* Custom scheduling system.

## 3.2 Server-First Rendering

The application should default to Server Components and server-side data fetching.

Chosen because:

* Better security for protected data.
* Less client-side JavaScript.
* Better performance.
* Easier integration with Supabase and Stripe.
* Easier route-level authorization.

Use Client Components only for:

* Interactive video player controls.
* Shadcn UI interactive components.
* Forms requiring client-side enhancement.
* Dashboard widgets with client interaction.
* Admin upload interactions.
* Progress tracking events.

## 3.3 Feature-Based Structure

The codebase should be organized by business feature, not technical layer only.

Chosen because:

* Easier maintainability.
* Clear domain boundaries.
* Reduced coupling.
* Easier onboarding.
* Easier future extraction if needed.

Examples of features:

* auth
* billing
* memberships
* content
* video
* progress
* certificates
* shop
* leads
* live-classes
* admin
* integrations

## 3.4 Stripe as Payment Source of Truth

Stripe will be the source of truth for payment, subscription, coupon, invoice, and billing states.

The local database will store a synchronized copy of relevant Stripe data for fast access checks and dashboard rendering.

Chosen because:

* Prevents payment state drift.
* Reduces liability.
* Uses Stripe’s billing infrastructure.
* Simplifies upgrades, downgrades, and cancellations.

## 3.5 Database as Authorization Backbone

Supabase PostgreSQL will store application-specific authorization state:

* roles
* plans
* content access rules
* subscriptions
* purchases
* user progress
* certificates

Application code will centralize entitlement checks. Supabase RLS will protect user-owned data where direct or client-accessible database queries exist.

## 3.6 Mux for Video Security

Mux will host and stream videos. The platform will never expose raw video files to users.

Signed playback should be used for protected content.

Chosen because:

* Prevents public playback URLs.
* Allows short-lived access.
* Supports secure subscriber-only playback.
* Avoids building video infrastructure.

Important limitation:

* No web video solution can fully prevent screen recording.
* The realistic security goal is to prevent unauthorized access, public sharing, and direct downloads.

---

# 4. Recommended Folder Structure

```text
src/
  app/
    (public)/
      page
      pricing
      shop
      live-classes
      retreats
      vip
      private-events
      free-taster

    (auth)/
      login
      register
      forgot-password
      reset-password

    (dashboard)/
      dashboard
      dashboard/videos
      dashboard/courses
      dashboard/products
      dashboard/certificates
      dashboard/account
      dashboard/billing

    (admin)/
      admin
      admin/videos
      admin/courses
      admin/products
      admin/members
      admin/leads
      admin/certificates
      admin/settings

    api/
      stripe/
        webhook
        checkout
        portal

      mux/
        webhook
        playback-token

      leads/
        submit

      products/
        download-url

      cron/
        process-jobs
        retry-integrations

  components/
    ui/
    layout/
    marketing/
    dashboard/
    admin/
    video/
    forms/

  features/
    auth/
    users/
    memberships/
    billing/
    content/
    video/
    progress/
    certificates/
    shop/
    leads/
    live-classes/
    admin/
    emails/
    integrations/

  lib/
    supabase/
    stripe/
    mux/
    resend/
    ghl/
    calendly/
    zoom/
    auth/
    authorization/
    validation/
    logging/
    errors/
    config/
    utils/

  server/
    actions/
    queries/
    services/
    jobs/
    webhooks/

  types/
    database/
    domain/
    api/

  constants/
    routes
    plans
    roles
    errors

  middleware
```

## 4.1 Folder Responsibility Rules

### app/

Contains routes, layouts, route groups, pages, and API Route Handlers.

Rules:

* Keep pages thin.
* Do not place business logic directly in page files.
* Fetch server data through query/service functions.
* Use route groups to separate public, auth, dashboard, and admin experiences.

### features/

Contains domain-specific UI, validation, types, and lightweight orchestration for each feature.

Rules:

* Feature modules should not directly know about unrelated features unless through service interfaces.
* Shared logic belongs in lib or server.
* Feature-specific forms and components live here or in components when reused globally.

### server/

Contains server-only business logic.

Rules:

* Payment fulfillment lives here.
* Entitlement checks live here.
* Certificate issuance lives here.
* Integration sync logic lives here.
* Webhook processors live here.
* Background job handlers live here.

### lib/

Contains provider clients, shared utilities, configuration, logging, and error helpers.

Rules:

* Provider clients must be initialized in server-safe files.
* Service role clients must never be imported into Client Components.
* Public environment variables must be clearly separated from secret variables.

### components/

Contains reusable presentation components.

Rules:

* UI components should be mostly dumb.
* Business rules should not live in generic components.
* Shadcn UI components should remain customizable but not heavily modified.

---

# 5. Feature-Based Architecture

## 5.1 Auth Feature

Responsibilities:

* Register.
* Login.
* Logout.
* Password reset.
* Session refresh.
* Profile creation.
* Basic account settings.

Depends on:

* Supabase Auth.
* profiles table.
* roles table or profile role field.

Must not handle:

* Subscription entitlements.
* Admin permissions beyond role lookup.
* Stripe payment state.

---

## 5.2 Memberships Feature

Responsibilities:

* Plan display.
* Plan comparison.
* Plan access rules.
* Active membership status.
* Member entitlement resolution.

Depends on:

* plans
* plan_prices
* subscriptions
* content_access_rules
* Stripe synced data

Must not directly call Stripe for every access check. Use local synchronized subscription data.

---

## 5.3 Billing Feature

Responsibilities:

* Create Stripe Checkout Sessions.
* Create Stripe Customer Portal Sessions.
* Handle subscription lifecycle.
* Handle one-time product purchase lifecycle.
* Store Stripe customer IDs.
* Sync subscription states.
* Sync invoices and purchase events where needed.

Depends on:

* Stripe.
* users/profiles.
* subscriptions.
* purchases.
* webhook_events.

Must not:

* Store raw card data.
* Trust checkout success redirect alone.
* Grant access before webhook confirmation unless explicitly using a safe pending state.

---

## 5.4 Content Feature

Responsibilities:

* Courses.
* Collections.
* Categories.
* Video metadata.
* Content publish states.
* Plan-based content visibility.
* Content ordering.

Depends on:

* courses
* content_items
* videos
* content_plan_access

Must not:

* Generate video playback tokens directly.
* Override authorization rules.

---

## 5.5 Video Feature

Responsibilities:

* Mux asset references.
* Playback token generation.
* Video readiness state.
* Thumbnail metadata.
* Video duration metadata.
* Admin video upload workflow.
* Video migration status.

Depends on:

* Mux.
* videos.
* content_items.
* authorization service.

Must not:

* Expose raw Mux secret keys.
* Expose raw downloadable files.
* Trust client-side plan checks.

---

## 5.6 Progress Feature

Responsibilities:

* Last watched timestamp.
* Video progress percentage.
* Completion detection.
* Course completion rollups.
* Resume watching.

Depends on:

* video_progress.
* course_progress.
* videos.
* courses.

Must not:

* Write to the database every second.
* Issue certificates directly without going through certificate service.
* Allow users to modify other users’ progress.

---

## 5.7 Certificates Feature

Responsibilities:

* Determine certificate eligibility.
* Issue certificates.
* Prevent duplicate certificates.
* Generate certificate metadata.
* Store certificate records.
* Make certificates visible in dashboard.

Depends on:

* certificates.
* course_progress.
* profiles.
* courses.
* optional Supabase Storage for PDFs.

Must not:

* Rely on client-side completion only.
* Issue duplicate certificates for same user and course.

---

## 5.8 Shop Feature

Responsibilities:

* Digital product catalog.
* One-time product checkout.
* Purchase records.
* Secure file access.
* Purchase confirmation emails.

Depends on:

* products.
* product_files.
* purchases.
* Stripe.
* Supabase Storage.
* Resend.

Must not:

* Serve files from public buckets unless intentionally public.
* Grant access from checkout redirect alone.
* Expose permanent download URLs.

---

## 5.9 Leads Feature

Responsibilities:

* VIP form.
* Retreat form.
* Private event form.
* Free taster form.
* Lead validation.
* Lead storage.
* Admin notification.
* GoHighLevel sync.

Depends on:

* leads.
* integration_events.
* Resend.
* GoHighLevel.

Must not:

* Block form success because GoHighLevel is temporarily unavailable.
* Store unnecessary sensitive data.
* Trust unvalidated user input.

---

## 5.10 Live Classes Feature

Responsibilities:

* Display live class options.
* Embed or link Calendly scheduling.
* Gate member-only classes.
* Store internal display metadata.
* Optionally sync booking events later.

Depends on:

* live_classes.
* Calendly.
* Zoom.
* memberships.

Must not:

* Build a custom calendar scheduler in MVP.
* Store Zoom host credentials in client-side code.

---

## 5.11 Admin Feature

Responsibilities:

* Content management.
* Weekly video upload.
* Product management.
* Lead viewing.
* Member viewing.
* Subscription status visibility.
* Certificate viewing.
* Migration status tracking.

Depends on:

* role authorization.
* all relevant domain services.

Must not:

* Bypass service-layer validation.
* Expose service-role database access to the browser.
* Allow non-admin users into admin routes.

---

# 6. Database Design

## 6.1 Database Principles

1. Use Supabase PostgreSQL as the primary application database.
2. Use Stripe IDs and Mux IDs as external references, not primary application identities.
3. Keep local subscription records synchronized from Stripe.
4. Keep access rules explicit and queryable.
5. Store user-owned data with user_id foreign keys.
6. Use UUID primary keys for internal records.
7. Enable Row Level Security on user-facing tables.
8. Use timestamps for auditability.
9. Prefer soft archival for business records over hard deletion.

---

# 6.2 Core Tables

## profiles

Stores application profile data linked to Supabase Auth users.

| Field              | Purpose                   |
| ------------------ | ------------------------- |
| id                 | Internal profile ID       |
| auth_user_id       | Supabase Auth user ID     |
| email              | User email                |
| full_name          | User display name         |
| phone              | Optional phone            |
| avatar_url         | Optional profile image    |
| role               | user, admin, super_admin  |
| stripe_customer_id | Stripe customer reference |
| created_at         | Creation timestamp        |
| updated_at         | Update timestamp          |

Notes:

* Supabase Auth owns credentials.
* profiles owns app-specific user metadata.
* role can start as an enum field and later move to a dedicated role table if permissions become complex.

---

## plans

Stores the three membership plans.

| Field       | Purpose                  |
| ----------- | ------------------------ |
| id          | Internal plan ID         |
| slug        | Stable identifier        |
| name        | Public plan name         |
| description | Public description       |
| sort_order  | Display order            |
| is_active   | Whether plan is sellable |
| created_at  | Creation timestamp       |
| updated_at  | Update timestamp         |

Examples:

* basic
* standard
* premium

Final names can be adjusted by the business.

---

## plan_prices

Stores Stripe price references for monthly and yearly billing.

| Field            | Purpose                    |
| ---------------- | -------------------------- |
| id               | Internal price ID          |
| plan_id          | Linked plan                |
| stripe_price_id  | Stripe Price ID            |
| billing_interval | monthly or yearly          |
| currency         | Currency                   |
| amount           | Display/reference amount   |
| is_active        | Whether price is available |
| created_at       | Creation timestamp         |
| updated_at       | Update timestamp           |

Notes:

* Stripe is the source of truth for price charging.
* Local amount is for display and validation only.
* Keep old prices inactive instead of deleting them.

---

## subscriptions

Stores synchronized Stripe subscription state.

| Field                  | Purpose                           |
| ---------------------- | --------------------------------- |
| id                     | Internal subscription ID          |
| user_id                | Profile/user reference            |
| plan_id                | Current plan                      |
| stripe_customer_id     | Stripe customer ID                |
| stripe_subscription_id | Stripe subscription ID            |
| stripe_price_id        | Current Stripe price ID           |
| status                 | Stripe subscription status        |
| current_period_start   | Billing period start              |
| current_period_end     | Billing period end                |
| cancel_at_period_end   | Whether access ends at period end |
| canceled_at            | Cancellation timestamp            |
| ended_at               | Subscription end timestamp        |
| created_at             | Creation timestamp                |
| updated_at             | Update timestamp                  |

Access rule:

* A user has membership access if subscription status and current period rules allow access.
* Canceled subscriptions should continue access until current_period_end when cancel_at_period_end is true.

---

## courses

Stores structured course/program containers.

| Field                | Purpose                               |
| -------------------- | ------------------------------------- |
| id                   | Course ID                             |
| slug                 | Public stable slug                    |
| title                | Course title                          |
| description          | Course description                    |
| thumbnail_url        | Course thumbnail                      |
| status               | draft, published, archived            |
| sort_order           | Display order                         |
| certificate_enabled  | Whether course can issue certificates |
| completion_threshold | Required completion percentage        |
| created_at           | Creation timestamp                    |
| updated_at           | Update timestamp                      |

---

## content_collections

Optional grouping for libraries, categories, series, or programs.

| Field       | Purpose                    |
| ----------- | -------------------------- |
| id          | Collection ID              |
| slug        | Stable slug                |
| title       | Collection title           |
| description | Collection description     |
| status      | draft, published, archived |
| sort_order  | Display order              |
| created_at  | Creation timestamp         |
| updated_at  | Update timestamp           |

---

## videos

Stores Mux-backed video metadata.

| Field            | Purpose                                                          |
| ---------------- | ---------------------------------------------------------------- |
| id               | Internal video ID                                                |
| mux_asset_id     | Mux asset reference                                              |
| mux_playback_id  | Mux signed playback ID                                           |
| title            | Video title                                                      |
| description      | Video description                                                |
| duration_seconds | Video duration                                                   |
| thumbnail_url    | Thumbnail                                                        |
| status           | uploading, processing, ready, failed, draft, published, archived |
| published_at     | Publish timestamp                                                |
| scheduled_at     | Optional scheduled publish timestamp                             |
| migration_status | not_started, uploaded, verified, failed                          |
| created_at       | Creation timestamp                                               |
| updated_at       | Update timestamp                                                 |

Notes:

* mux_playback_id should reference signed playback, not public playback.
* Video files are not served from Supabase Storage to members.
* Existing 57 videos should be tracked through migration_status.

---

## course_videos

Maps videos into courses.

| Field       | Purpose                         |
| ----------- | ------------------------------- |
| id          | Mapping ID                      |
| course_id   | Course reference                |
| video_id    | Video reference                 |
| sort_order  | Order within course             |
| is_required | Whether required for completion |
| created_at  | Creation timestamp              |

---

## collection_videos

Maps videos into collections.

| Field         | Purpose                 |
| ------------- | ----------------------- |
| id            | Mapping ID              |
| collection_id | Collection reference    |
| video_id      | Video reference         |
| sort_order    | Order within collection |
| created_at    | Creation timestamp      |

---

## content_plan_access

Defines which plans can access which content.

| Field        | Purpose                                  |
| ------------ | ---------------------------------------- |
| id           | Access rule ID                           |
| plan_id      | Plan reference                           |
| content_type | video, course, collection, product_bonus |
| content_id   | Referenced content ID                    |
| created_at   | Creation timestamp                       |

Notes:

* This table is central to plan-based access.
* Access should never be hardcoded into page components.
* For MVP, use explicit rows rather than complex rule engines.

---

## video_progress

Stores per-user video progress.

| Field                 | Purpose                     |
| --------------------- | --------------------------- |
| id                    | Progress ID                 |
| user_id               | User reference              |
| video_id              | Video reference             |
| last_position_seconds | Resume timestamp            |
| watched_seconds       | Approximate watched seconds |
| progress_percentage   | Completion percentage       |
| completed_at          | Completion timestamp        |
| updated_at            | Update timestamp            |

Constraints:

* Unique user_id plus video_id.
* Users can only access their own progress.
* Writes should be throttled from the client.

---

## course_progress

Stores course-level progress rollups.

| Field               | Purpose              |
| ------------------- | -------------------- |
| id                  | Course progress ID   |
| user_id             | User reference       |
| course_id           | Course reference     |
| progress_percentage | Course progress      |
| completed_at        | Completion timestamp |
| updated_at          | Update timestamp     |

Notes:

* Can be recalculated from video_progress.
* Store rollup for dashboard performance.

---

## certificates

Stores issued certificates.

| Field              | Purpose                                  |
| ------------------ | ---------------------------------------- |
| id                 | Certificate ID                           |
| certificate_number | Human-readable unique certificate number |
| user_id            | User reference                           |
| course_id          | Course reference                         |
| issued_at          | Issue timestamp                          |
| pdf_storage_path   | Optional PDF path                        |
| verification_token | Public verification token                |
| created_at         | Creation timestamp                       |

Constraints:

* Unique user_id plus course_id.
* Unique certificate_number.
* Unique verification_token.

---

## products

Stores digital products such as ebooks.

| Field           | Purpose                         |
| --------------- | ------------------------------- |
| id              | Product ID                      |
| slug            | Public slug                     |
| title           | Product title                   |
| description     | Product description             |
| product_type    | ebook, digital_download, bundle |
| price_amount    | Display/reference price         |
| currency        | Currency                        |
| stripe_price_id | Stripe Price ID                 |
| cover_image_url | Product image                   |
| status          | draft, published, archived      |
| created_at      | Creation timestamp              |
| updated_at      | Update timestamp                |

---

## product_files

Stores secure file references for digital products.

| Field          | Purpose            |
| -------------- | ------------------ |
| id             | File ID            |
| product_id     | Product reference  |
| storage_bucket | Supabase bucket    |
| storage_path   | Private file path  |
| file_name      | Display file name  |
| mime_type      | File type          |
| size_bytes     | File size          |
| created_at     | Creation timestamp |

---

## purchases

Stores one-time purchase fulfillment state.

| Field                      | Purpose                                   |
| -------------------------- | ----------------------------------------- |
| id                         | Purchase ID                               |
| user_id                    | User reference                            |
| product_id                 | Product reference                         |
| stripe_checkout_session_id | Checkout session ID                       |
| stripe_payment_intent_id   | Payment intent ID                         |
| amount_paid                | Amount paid                               |
| currency                   | Currency                                  |
| status                     | pending, paid, failed, refunded, disputed |
| purchased_at               | Purchase timestamp                        |
| created_at                 | Creation timestamp                        |
| updated_at                 | Update timestamp                          |

Notes:

* Product access is granted only after paid status is confirmed by Stripe webhook.
* Refunds are not offered by policy, but Stripe disputes/refunds should still be representable if they occur.

---

## leads

Stores lead form submissions.

| Field           | Purpose                                  |
| --------------- | ---------------------------------------- |
| id              | Lead ID                                  |
| lead_type       | vip, retreat, private_event, free_taster |
| name            | Lead name                                |
| email           | Lead email                               |
| phone           | Optional phone                           |
| message         | Message                                  |
| metadata        | Form-specific fields                     |
| source          | Website source                           |
| ghl_contact_id  | GoHighLevel contact reference            |
| ghl_sync_status | pending, synced, failed                  |
| created_at      | Creation timestamp                       |
| updated_at      | Update timestamp                         |

---

## live_classes

Stores live class display metadata.

| Field         | Purpose                                           |
| ------------- | ------------------------------------------------- |
| id            | Live class ID                                     |
| title         | Class title                                       |
| description   | Class description                                 |
| calendly_url  | Booking URL                                       |
| zoom_join_url | Optional internal/admin reference                 |
| access_type   | public, authenticated, member_only, plan_specific |
| status        | draft, published, archived                        |
| starts_at     | Optional class start                              |
| created_at    | Creation timestamp                                |
| updated_at    | Update timestamp                                  |

Notes:

* Calendly remains the scheduling source of truth for MVP.
* Zoom links should not be exposed unless the user is authorized or the booking flow provides them.

---

## webhook_events

Stores received external webhook events.

| Field             | Purpose                              |
| ----------------- | ------------------------------------ |
| id                | Internal event ID                    |
| provider          | stripe, mux, calendly, resend        |
| provider_event_id | External event ID                    |
| event_type        | Event type                           |
| payload           | Sanitized JSON payload               |
| status            | received, processed, failed, ignored |
| error_message     | Failure reason                       |
| processed_at      | Processing timestamp                 |
| created_at        | Creation timestamp                   |

Constraints:

* Unique provider plus provider_event_id.

Purpose:

* Idempotency.
* Debugging.
* Replay support.
* Operational visibility.

---

## integration_jobs

Stores retryable async work.

| Field        | Purpose                                                               |
| ------------ | --------------------------------------------------------------------- |
| id           | Job ID                                                                |
| job_type     | ghl_sync, send_email, issue_certificate, process_video, retry_webhook |
| status       | pending, processing, completed, failed                                |
| payload      | Job payload                                                           |
| attempts     | Attempt count                                                         |
| max_attempts | Maximum attempts                                                      |
| next_run_at  | Next retry time                                                       |
| last_error   | Error summary                                                         |
| created_at   | Creation timestamp                                                    |
| updated_at   | Update timestamp                                                      |

Purpose:

* Keep non-critical integrations decoupled.
* Retry GoHighLevel syncs.
* Retry email sends.
* Support certificate generation.
* Provide operational visibility.

---

# 7. Authentication Strategy

## 7.1 Provider

Use Supabase Auth.

Supported MVP auth methods:

* Email and password.
* Password reset.
* Email verification if required by business.
* Optional OAuth later.

## 7.2 Session Handling

Use Supabase server-side auth with cookies for Next.js App Router.

Principles:

* Server Components should read the authenticated user server-side.
* Middleware should refresh sessions where required.
* Client Components should not own authorization decisions.
* The browser should not receive service-role credentials.

## 7.3 User Profile Creation

When a Supabase Auth user is created:

1. Create or upsert a profile record.
2. Store email and basic metadata.
3. Default role to user.
4. Create Stripe customer lazily during first checkout, or eagerly after registration if business wants all users in Stripe.

Recommendation:

* Create Stripe customers lazily at checkout to avoid unnecessary Stripe records for casual registrants.

## 7.4 Password Reset

Use Supabase Auth password reset flow.

The application should provide branded pages for:

* Forgot password.
* Reset password.
* Confirmation state.
* Invalid or expired token state.

---

# 8. Authorization Strategy

## 8.1 Authorization Layers

Authorization should happen in four layers:

1. Route-level protection.
2. Server-side role checks.
3. Server-side entitlement checks.
4. Supabase Row Level Security.

No single layer should be treated as the only protection.

---

## 8.2 Role-Based Authorization

Roles:

* public visitor
* authenticated user
* active member
* admin
* super_admin

Implementation principle:

* authenticated user comes from Supabase Auth.
* active member is derived from subscription entitlement.
* admin/super_admin comes from profile role.
* Do not use client-side state as proof of role.

---

## 8.3 Entitlement-Based Authorization

Membership access should be determined by an entitlement service.

The entitlement service answers questions like:

* Can this user watch this video?
* Can this user access this course?
* Can this user download this product?
* Can this user book this member-only class?
* Can this user view this admin page?

Entitlement logic should consider:

* active subscription status
* current_period_end
* cancel_at_period_end
* plan_id
* content_plan_access records
* one-time product purchases
* admin override

---

## 8.4 Content Access Rules

Access should be plan-based and explicit.

Recommended MVP approach:

* Plans are stored in plans.
* Stripe prices are mapped to plans in plan_prices.
* Content is mapped to plans in content_plan_access.
* A user’s active subscription maps to one plan.
* The entitlement service checks whether the user’s current plan is allowed for the requested content.

Avoid:

* Hardcoding plan names in React components.
* Checking access only in the client.
* Using Stripe API calls on every content request.

---

## 8.5 Supabase Row Level Security

RLS should be enabled on sensitive tables, especially:

* profiles
* video_progress
* course_progress
* certificates
* purchases
* leads if users can view their own submissions
* private product access records

General policy direction:

* Users can read their own profile.
* Users can update limited fields on their own profile.
* Users can read their own progress.
* Users can update their own progress through controlled server paths.
* Users can read their own purchases.
* Users can read their own certificates.
* Admins can read operational tables where needed.
* Public users should not directly read protected content records unless intentionally exposed.

Important:

* RLS is not a replacement for application-layer business rules.
* Service-role access should only be used server-side in trusted actions, jobs, and webhooks.

---

# 9. Route Protection

## 9.1 Public Routes

Examples:

* /
* /pricing
* /shop
* /shop/[slug]
* /live-classes
* /vip
* /retreats
* /private-events
* /free-taster
* /login
* /register
* /forgot-password

Rules:

* Public pages may show marketing content.
* Public pages may show locked previews.
* Public pages must not expose protected playback tokens or private files.

---

## 9.2 Authenticated Routes

Examples:

* /dashboard
* /dashboard/videos
* /dashboard/courses
* /dashboard/products
* /dashboard/certificates
* /dashboard/account
* /dashboard/billing

Rules:

* Must require an authenticated Supabase session.
* If unauthenticated, redirect to login.
* User-specific data must be loaded server-side.
* Entitlement checks must happen before showing protected resources.

---

## 9.3 Admin Routes

Examples:

* /admin
* /admin/videos
* /admin/products
* /admin/members
* /admin/leads
* /admin/certificates
* /admin/settings

Rules:

* Must require authentication.
* Must require admin or super_admin role.
* Authorization should be checked in the admin layout and again in sensitive server actions.
* Non-admin users should receive a 403 or be redirected to a safe page.
* Admin data mutations must be audited where practical.

---

## 9.4 API Routes

Examples:

* /api/stripe/webhook
* /api/stripe/checkout
* /api/stripe/portal
* /api/mux/webhook
* /api/mux/playback-token
* /api/products/download-url
* /api/leads/submit
* /api/cron/process-jobs

Rules:

* Provider webhooks must verify signatures when supported.
* User-initiated API routes must verify session.
* Admin-only API routes must verify admin role.
* Cron routes must verify an internal secret.
* API routes should return stable error shapes.

---

# 10. API Architecture

## 10.1 Route Handler Usage

Use Next.js Route Handlers for:

* Stripe webhooks.
* Mux webhooks.
* Calendly webhooks if added.
* Resend webhooks if added.
* Stripe Checkout Session creation.
* Stripe Customer Portal Session creation.
* Mux playback token generation.
* Secure digital product download URL generation.
* Cron job endpoints.
* Public lead form submission if not using Server Actions.

Route Handlers are appropriate when:

* The endpoint is called by an external provider.
* A stable HTTP endpoint is required.
* Raw request body is needed.
* A client-side component needs a server endpoint.
* A cron system needs an HTTP target.

---

## 10.2 API Design Principles

1. Every API route must validate input.
2. Every protected API route must authenticate the user.
3. Every sensitive API route must authorize the operation.
4. Never trust client-provided price, plan, product, role, or user ID.
5. Use Stripe IDs and database records to verify payment-related operations.
6. Return consistent error responses.
7. Log unexpected failures with request context.
8. Avoid leaking provider errors directly to users.
9. Keep Route Handlers thin and delegate to services.
10. Make webhooks idempotent.

---

## 10.3 Proposed API Routes

## Stripe

### Create Subscription Checkout

Route:

* POST /api/stripe/checkout

Purpose:

* Create a Stripe Checkout Session for a subscription or one-time digital product.

Auth:

* User should be authenticated for memberships.
* Guest checkout for digital products is possible but not recommended for MVP unless required.

Input:

* plan_price_id for subscriptions.
* product_id for digital products.
* optional coupon code if supported.

Server behavior:

* Validate user.
* Validate plan or product from database.
* Create or reuse Stripe customer.
* Create Stripe Checkout Session.
* Return checkout URL.

---

### Create Billing Portal Session

Route:

* POST /api/stripe/portal

Purpose:

* Send user to Stripe Customer Portal.

Auth:

* Authenticated user only.

Server behavior:

* Verify profile has Stripe customer ID.
* Create customer portal session.
* Return portal URL.

---

### Stripe Webhook

Route:

* POST /api/stripe/webhook

Purpose:

* Receive Stripe events and sync local state.

Auth:

* Stripe signature verification.

Events to handle:

* checkout.session.completed
* customer.subscription.created
* customer.subscription.updated
* customer.subscription.deleted
* invoice.paid
* invoice.payment_failed
* payment_intent.succeeded
* payment_intent.payment_failed
* charge.refunded, only for operational awareness
* dispute.created, if needed

Server behavior:

* Verify signature.
* Store webhook event.
* Check idempotency.
* Process event.
* Update subscription or purchase records.
* Enqueue emails or CRM sync jobs if needed.

---

## Mux

### Generate Playback Token

Route:

* POST /api/mux/playback-token

Purpose:

* Generate a signed playback token for authorized users.

Auth:

* Authenticated user.

Server behavior:

* Validate user.
* Validate video exists and is ready.
* Check entitlement.
* Generate short-lived signed playback details.
* Return playback data to the client.

---

### Mux Webhook

Route:

* POST /api/mux/webhook

Purpose:

* Receive Mux asset status updates.

Auth:

* Mux webhook signature verification if configured.

Events to handle:

* video.asset.ready
* video.asset.errored
* video.upload.asset_created
* video.asset.updated

Server behavior:

* Store webhook event.
* Update video processing status.
* Store duration and playback metadata where available.
* Notify admin on processing failures if needed.

---

## Products

### Generate Secure Product Download URL

Route:

* POST /api/products/download-url

Purpose:

* Generate a signed Supabase Storage URL for a purchased digital product.

Auth:

* Authenticated user.

Server behavior:

* Validate purchase ownership.
* Validate purchase status is paid.
* Generate short-lived signed URL.
* Return URL.

---

## Leads

### Submit Lead

Route:

* POST /api/leads/submit

Purpose:

* Submit VIP, retreat, private event, or free taster lead.

Auth:

* Public or authenticated.

Server behavior:

* Validate fields.
* Apply spam/rate-limit checks.
* Store lead.
* Enqueue admin notification email.
* Enqueue GoHighLevel sync.
* Return success.

---

## Cron

### Process Jobs

Route:

* GET /api/cron/process-jobs

Purpose:

* Process pending background jobs.

Auth:

* Internal cron secret.

Server behavior:

* Find due jobs.
* Lock jobs for processing.
* Process limited batch.
* Mark completed or failed.
* Schedule retries with backoff.

---

# 11. Server Actions Architecture

## 11.1 Server Action Usage

Use Server Actions for authenticated application mutations where the request originates from the Next.js UI.

Good use cases:

* Updating profile.
* Saving progress.
* Admin creating/editing courses.
* Admin editing video metadata.
* Admin assigning content to plans.
* Admin creating digital products.
* Admin publishing/unpublishing content.
* Admin updating live class display metadata.
* Submitting internal dashboard forms.

Avoid Server Actions for:

* Stripe webhooks.
* Mux webhooks.
* Provider callbacks.
* Endpoints needing raw request body.
* Public APIs consumed by third parties.

---

## 11.2 Server Action Rules

Every Server Action must:

1. Validate input.
2. Read authenticated user server-side.
3. Check authorization.
4. Perform mutation through a service function.
5. Return a typed success/error result.
6. Revalidate affected paths when needed.
7. Avoid leaking internal errors to the UI.
8. Log unexpected failures.

---

## 11.3 Server Action Boundaries

Server Actions should not contain complex business logic directly.

Preferred structure:

```text
Server Action
   -> validate input
   -> authenticate user
   -> authorize operation
   -> call domain service
   -> revalidate cache/path
   -> return result
```

Domain services should hold business rules.

---

# 12. File Storage

## 12.1 Storage Provider

Use Supabase Storage.

## 12.2 Recommended Buckets

### product-files

Purpose:

* Private ebook and digital product files.

Access:

* Private.
* Signed URLs only.
* Purchaser-only access.

---

### product-images

Purpose:

* Product cover images.

Access:

* Public or private depending on brand needs.
* Public is acceptable for marketing images.

---

### certificate-files

Purpose:

* Generated certificate PDFs.

Access:

* Private.
* Signed URLs for the certificate owner.
* Admin access through admin panel.

---

### admin-uploads

Purpose:

* Temporary admin uploads if needed before sending files to Mux or processing.

Access:

* Private.
* Admin-only.

---

## 12.3 File Access Rules

1. Never expose private storage paths as permanent public URLs.
2. Generate signed URLs only after server-side authorization.
3. Use short expiry windows for downloads.
4. Store file metadata separately from file storage.
5. Validate file type and size for admin uploads.
6. Scan or restrict risky file types where possible.
7. Do not store protected videos for member playback in Supabase Storage.

---

# 13. Video Streaming Architecture

## 13.1 Video Provider

Use Mux for all protected video hosting and playback.

## 13.2 Video Lifecycle

1. Admin uploads or registers a video.
2. Video is uploaded to Mux.
3. Mux processes the asset.
4. Mux webhook updates local video status.
5. Admin reviews metadata.
6. Admin assigns content to plans/courses/collections.
7. Admin publishes video.
8. Authorized members request playback.
9. Server validates entitlement.
10. Server returns signed playback details.
11. Client player loads video through Mux.

---

## 13.3 Secure Playback

Protected playback should use signed playback.

Rules:

* Do not use public playback IDs for paid content.
* Do not expose Mux signing secrets to the browser.
* Generate playback access only after entitlement check.
* Use short-lived playback tokens.
* Deny playback for users without valid access.
* Deny playback for unpublished, archived, failed, or processing videos.

---

## 13.4 Video Migration

Existing library:

* 57 videos.
* Approximately 24 hours of content.

Migration process:

1. Create migration inventory.
2. Collect title, description, category, plan access, duration, and source file for each video.
3. Upload/import each video into Mux.
4. Store Mux asset IDs.
5. Wait for processing.
6. Verify duration and playback.
7. Assign plan access.
8. Assign course/collection placement.
9. Mark migration status as verified.
10. Run final access-control QA.

Migration status should be visible in admin.

---

## 13.5 Download Protection

The platform will prevent:

* Public video URLs.
* Raw file access.
* Unauthenticated playback.
* Playback outside plan access.
* Long-lived shareable links.

The platform cannot fully prevent:

* Screen recording.
* Filming the screen with another device.
* Credential sharing without additional device/session limits.

Future stronger protection:

* DRM.
* Watermarking.
* Concurrent stream limits.
* Device limits.
* Suspicious access detection.

---

# 14. Payment Flow

## 14.1 Subscription Checkout Flow

1. User selects membership plan.
2. User selects monthly or yearly billing.
3. User is authenticated or prompted to create account/login.
4. Server validates selected plan price.
5. Server creates or reuses Stripe customer.
6. Server creates Stripe Checkout Session.
7. User completes payment on Stripe Checkout.
8. Stripe sends webhook.
9. Webhook updates local subscription.
10. User dashboard shows plan access.
11. Confirmation email is sent.

Important:

* Do not grant subscription access from the success redirect alone.
* Access should be granted after Stripe webhook confirmation.
* A temporary pending screen can explain that payment is being confirmed.

---

## 14.2 Upgrade Flow

Recommended MVP approach:

* Use Stripe Customer Portal for upgrades where possible.

Flow:

1. User opens billing management.
2. Server creates Stripe Customer Portal Session.
3. User updates subscription in Stripe portal.
4. Stripe sends subscription updated webhook.
5. Local subscription is updated.
6. Entitlements update based on new plan and billing state.

Reason:

* Less custom billing logic.
* Stripe handles proration and plan changes.
* Lower implementation risk.

---

## 14.3 Downgrade Flow

Recommended MVP approach:

* Use Stripe Customer Portal.

Business rule:

* Downgrade behavior should follow Stripe configuration.
* If downgrade is scheduled for next billing period, current access can remain until period end.
* If downgrade applies immediately, access updates after webhook confirmation.

The product should clearly communicate when access changes.

---

## 14.4 Cancellation Flow

Recommended MVP approach:

* Use Stripe Customer Portal.
* Configure cancellation to end access at the end of the paid billing period.
* No automatic refunds.

Flow:

1. User opens billing portal.
2. User cancels subscription.
3. Stripe marks cancel_at_period_end.
4. Webhook updates local subscription.
5. User keeps access until current_period_end.
6. Access ends after the paid period expires.

---

## 14.5 One-Time Digital Product Purchase Flow

1. User selects product.
2. Server validates product and Stripe price.
3. Server creates Stripe Checkout Session in payment mode.
4. User completes payment.
5. Stripe sends checkout/payment webhook.
6. Webhook creates or updates purchase record.
7. Product appears in dashboard.
8. Confirmation email is sent.
9. User requests signed download URL.
10. Server verifies purchase before generating signed URL.

---

## 14.6 Coupons and Discounts

Recommended approach:

* Use Stripe coupons and promotion codes for payment enforcement.
* Store optional local coupon metadata only for display/admin convenience.

Rules:

* Do not calculate final payment amount client-side.
* Validate coupon eligibility through Stripe.
* Use Stripe Checkout for applying discounts.
* Show coupon terms clearly before checkout when possible.

---

# 15. Webhook Architecture

## 15.1 Webhook Principles

1. Verify provider signatures.
2. Store each event before or during processing.
3. Enforce idempotency.
4. Process events through provider-specific handlers.
5. Never trust unauthenticated webhook calls.
6. Avoid long blocking work inside webhook response.
7. Enqueue secondary tasks such as emails and CRM sync.
8. Log failed events.
9. Support manual replay or retry where possible.

---

## 15.2 Stripe Webhooks

Stripe webhook processor responsibilities:

* Sync customers.
* Sync subscriptions.
* Sync subscription status.
* Sync current_period_end.
* Sync cancel_at_period_end.
* Create purchase records.
* Mark purchases as paid.
* Record failed payments.
* Trigger confirmation emails.
* Trigger GoHighLevel lifecycle events if needed.

Critical events:

* checkout.session.completed
* customer.subscription.created
* customer.subscription.updated
* customer.subscription.deleted
* invoice.paid
* invoice.payment_failed
* payment_intent.succeeded
* payment_intent.payment_failed

Idempotency:

* Store Stripe event ID.
* Ignore already processed events.
* Upsert subscription by stripe_subscription_id.
* Upsert purchase by checkout session or payment intent.

---

## 15.3 Mux Webhooks

Mux webhook processor responsibilities:

* Update video asset status.
* Store duration.
* Store playback metadata.
* Mark processing failures.
* Update migration status.
* Notify admin if upload fails.

Idempotency:

* Store Mux event ID where available.
* Ignore already processed events.
* Update video by mux_asset_id.

---

## 15.4 Calendly Webhooks

Not required for MVP unless deeper booking sync is needed.

Future use:

* Store bookings.
* Track free taster attendance.
* Trigger GoHighLevel workflow.
* Show upcoming bookings in dashboard.

---

## 15.5 Resend Webhooks

Optional for MVP.

Future use:

* Track email delivery.
* Track bounces.
* Track complaints.
* Suppress invalid emails.

---

# 16. Background Jobs

## 16.1 MVP Background Job Strategy

Use a database-backed job table plus Vercel Cron.

Chosen because:

* Low infrastructure cost.
* Easy to inspect.
* Simple to implement.
* Good enough for early scale.
* Avoids introducing a queue service too early.

Use integration_jobs for:

* GoHighLevel sync.
* Email retries.
* Certificate generation.
* Failed webhook retry.
* Mux migration follow-up.
* Scheduled publishing.
* Cleanup tasks.

---

## 16.2 Job Execution

Recommended pattern:

1. User action or webhook creates job record.
2. Fast response is returned to user/provider.
3. Vercel Cron calls process-jobs route.
4. Job runner processes due jobs in small batches.
5. Job status is updated.
6. Failed jobs retry with backoff.
7. Permanently failed jobs are visible to admin.

---

## 16.3 Immediate Non-Critical Work

For small non-critical tasks after a response, the app may use Vercel-compatible post-response execution.

Appropriate examples:

* Logging analytics.
* Lightweight email enqueue.
* Cache updates.
* Non-critical provider sync enqueue.

Avoid using this for:

* Long video processing.
* Large file migration.
* Heavy batch jobs.
* Critical payment fulfillment.

---

## 16.4 When to Add a Real Queue

Consider Trigger.dev, Inngest, QStash, or Supabase Edge Functions if:

* Job volume grows.
* Retries become complex.
* Workflows need durable steps.
* Video migration automation becomes heavy.
* Admin needs detailed job monitoring.
* Cron-based processing becomes unreliable or too slow.

Do not add this for MVP unless necessary.

---

# 17. Logging

## 17.1 Logging Principles

Use structured logs.

Every important log should include:

* event name
* request ID if available
* user ID if authenticated
* provider
* provider event ID
* entity ID
* status
* error code
* safe error message

Do not log:

* passwords
* access tokens
* refresh tokens
* Stripe secret keys
* Mux signing keys
* full payment details
* private download URLs
* sensitive form data beyond what is operationally necessary

---

## 17.2 What to Log

Log these events:

* login failures above normal threshold
* checkout session creation failures
* Stripe webhook received
* Stripe webhook processing success/failure
* Mux webhook processing success/failure
* playback token denied/granted
* product download URL denied/granted
* lead submission success/failure
* GoHighLevel sync success/failure
* email send success/failure
* certificate issued
* admin publish/unpublish actions
* job retries and failures

---

# 18. Monitoring

## 18.1 MVP Monitoring Stack

Use:

* Vercel Runtime Logs.
* Vercel Observability.
* Supabase logs and database metrics.
* Stripe Dashboard events.
* Mux asset and delivery dashboard.
* Resend email dashboard.
* GoHighLevel sync logs in the application database.

Optional but recommended after MVP:

* Sentry for application error tracking.
* Uptime monitoring for public site and critical API endpoints.

---

## 18.2 Alerts

Minimum alerts:

* Stripe webhook failures.
* High number of payment failures.
* Mux video processing failures.
* GoHighLevel sync failures above threshold.
* Resend email failures above threshold.
* Cron job failures.
* Increased 500 errors.
* Unauthorized admin access attempts.

---

# 19. Deployment

## 19.1 Hosting

Use Vercel.

Deployment environments:

* local
* preview
* production

Recommended setup:

* Every pull request gets a Vercel Preview deployment.
* Production deploys from main branch.
* Environment variables are separated by environment.
* Production secrets are never used locally or in preview.

---

## 19.2 Supabase Environments

Recommended:

* One Supabase project for production.
* One Supabase project for staging/development if budget allows.

Minimum acceptable:

* Production Supabase project.
* Local development with Supabase local CLI or clearly separated dev tables.

Production data should not be casually used in development.

---

## 19.3 Database Migrations

Rules:

* All schema changes must be migration-controlled.
* No manual production schema changes without migration record.
* Migrations should be reviewed before deployment.
* Seed data should be separate from schema migrations.
* Stripe product/price IDs should be configured per environment.

---

## 19.4 Deployment Checklist

Before production launch:

1. Production environment variables configured.
2. Stripe webhooks configured.
3. Mux webhooks configured.
4. Supabase RLS enabled and tested.
5. Admin user created securely.
6. Stripe products and prices verified.
7. Mux videos migrated and verified.
8. Email domain verified in Resend.
9. GoHighLevel API credentials configured.
10. Calendly and Zoom links verified.
11. No-refund policy visible in checkout flow.
12. Public pages responsive.
13. Protected routes tested.
14. Admin routes tested.
15. Backup strategy understood.

---

# 20. Security

## 20.1 Authentication Security

* Use Supabase Auth.
* Use secure cookies.
* Use server-side session checks.
* Require strong passwords if configurable.
* Enable email verification if business prefers stricter access.
* Consider MFA for admin users if supported by the chosen auth setup.

---

## 20.2 Authorization Security

* Centralize entitlement checks.
* Enforce role checks server-side.
* Enforce content access server-side.
* Enforce product ownership before signed downloads.
* Enforce admin role in admin layouts and admin actions.
* Use RLS for user-owned data.

---

## 20.3 Payment Security

* Do not store card data.
* Use Stripe Checkout and Customer Portal.
* Verify Stripe webhook signatures.
* Do not trust success redirects.
* Use webhook events for fulfillment.
* Keep Stripe secret key server-only.
* Store Stripe event IDs for idempotency.

---

## 20.4 Video Security

* Use Mux signed playback.
* Use short-lived playback tokens.
* Do not expose Mux signing secrets.
* Do not expose raw video files.
* Check entitlement before issuing playback.
* Do not rely on hidden UI alone.

---

## 20.5 File Security

* Store digital products in private storage.
* Generate signed download URLs only after ownership checks.
* Use short-lived URLs.
* Validate uploads.
* Avoid public buckets for paid files.
* Do not log signed URLs.

---

## 20.6 API Security

* Validate all inputs.
* Rate-limit public forms and sensitive endpoints.
* Verify webhook signatures.
* Protect cron routes with internal secrets.
* Return generic errors to users.
* Log internal error details safely.
* Use CSRF-safe patterns for mutations.
* Avoid exposing stack traces.

---

## 20.7 Admin Security

* Admin access must be role-protected.
* Admin actions should be server-authorized.
* Super admin should manage admin roles.
* Admin activity should be logged for sensitive actions.
* Avoid granting broad admin access casually.
* Admin users should use strong passwords.

---

# 21. Environment Variables

## 21.1 Public Variables

Only expose variables that are safe for the browser.

Examples:

* NEXT_PUBLIC_APP_URL
* NEXT_PUBLIC_SUPABASE_URL
* NEXT_PUBLIC_SUPABASE_ANON_KEY
* NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
* NEXT_PUBLIC_MUX_ENV_KEY, only if needed by player analytics and safe to expose

Rules:

* Public variables must never contain secrets.
* Anything with secret, private, signing, service, webhook, or API key in the name must be server-only.

---

## 21.2 Server-Only Variables

Supabase:

* SUPABASE_SERVICE_ROLE_KEY
* SUPABASE_JWT_SECRET, only if required
* SUPABASE_DATABASE_URL, only if direct DB access is used

Stripe:

* STRIPE_SECRET_KEY
* STRIPE_WEBHOOK_SECRET
* STRIPE_CUSTOMER_PORTAL_RETURN_URL
* STRIPE_SUCCESS_URL
* STRIPE_CANCEL_URL

Mux:

* MUX_TOKEN_ID
* MUX_TOKEN_SECRET
* MUX_SIGNING_KEY_ID
* MUX_SIGNING_PRIVATE_KEY
* MUX_WEBHOOK_SECRET

Resend:

* RESEND_API_KEY
* RESEND_FROM_EMAIL
* ADMIN_NOTIFICATION_EMAIL

GoHighLevel:

* GHL_API_KEY or GHL_ACCESS_TOKEN
* GHL_LOCATION_ID
* GHL_PIPELINE_ID, if needed

Calendly:

* CALENDLY_API_KEY, only if API integration is used
* CALENDLY_WEBHOOK_SECRET, if webhooks are used

Zoom:

* ZOOM_CLIENT_ID, only if API integration is used
* ZOOM_CLIENT_SECRET, only if API integration is used
* ZOOM_ACCOUNT_ID, if server-to-server OAuth is used

Internal:

* CRON_SECRET
* INTERNAL_JOB_SECRET
* APP_ENV
* LOG_LEVEL

---

# 22. Error Handling

## 22.1 Error Categories

Use clear error categories:

* validation_error
* authentication_required
* authorization_failed
* entitlement_required
* not_found
* payment_required
* provider_error
* webhook_error
* rate_limited
* conflict
* unknown_error

---

## 22.2 User-Facing Error Rules

User-facing errors should be:

* clear
* short
* actionable
* non-technical
* safe

Examples:

* “Please log in to continue.”
* “Your current plan does not include this video.”
* “We could not confirm your payment yet. Please refresh in a moment.”
* “This download link has expired. Generate a new one from your dashboard.”
* “Something went wrong while submitting the form. Please try again.”

---

## 22.3 Internal Error Rules

Internal logs should include:

* error category
* operation name
* user ID if applicable
* provider if applicable
* provider event ID if applicable
* entity ID
* stack trace where safe
* sanitized payload summary

Do not expose internal error details to the browser.

---

# 23. Coding Conventions

## 23.1 TypeScript

Rules:

* Use strict TypeScript.
* Avoid any unless explicitly justified.
* Use shared domain types.
* Generate or maintain database types from Supabase.
* Keep provider-specific types isolated.
* Use explicit return types for service functions.

---

## 23.2 Naming

Recommended naming:

* Database tables: snake_case plural.
* TypeScript variables: camelCase.
* React components: PascalCase.
* Server actions: verb-based names.
* Service functions: domain action names.
* Route constants: centralized.

Examples:

* createCheckoutSession
* issueCertificate
* canAccessVideo
* syncStripeSubscription
* generateProductDownloadUrl
* submitLead

---

## 23.3 Validation

Use schema validation for:

* forms
* Server Actions
* API route inputs
* webhook payload assumptions
* admin mutations

Rules:

* Never trust client input.
* Never trust price IDs without database lookup.
* Never trust user IDs submitted from forms when session user is available.
* Never trust role fields from the client.

---

## 23.4 Component Rules

* Prefer Server Components by default.
* Use Client Components only where interactivity is needed.
* Keep forms small and feature-specific.
* Avoid putting business logic in UI components.
* Keep Shadcn UI components clean and reusable.
* Avoid deeply nested prop chains where server data can be fetched closer to route boundaries.

---

## 23.5 Service Layer Rules

Services should:

* Own business rules.
* Be server-only.
* Validate authorization assumptions.
* Be testable without UI.
* Avoid direct coupling to React components.

Examples:

* billingService
* entitlementService
* videoService
* progressService
* certificateService
* leadService
* productService

---

# 24. Performance Considerations

## 24.1 Rendering

* Public marketing pages should be static or mostly static.
* User dashboards should be dynamic and server-rendered.
* Admin pages should be dynamic and paginated.
* Avoid unnecessary client-side fetching for server-known data.
* Avoid waterfalls by fetching related dashboard data together.

---

## 24.2 Database

Add indexes for:

* profiles.auth_user_id
* profiles.stripe_customer_id
* subscriptions.user_id
* subscriptions.stripe_subscription_id
* subscriptions.status
* content_plan_access.plan_id
* content_plan_access.content_type plus content_id
* video_progress.user_id plus video_id
* course_progress.user_id plus course_id
* purchases.user_id
* purchases.product_id
* purchases.stripe_checkout_session_id
* certificates.user_id
* certificates.verification_token
* leads.lead_type
* webhook_events.provider plus provider_event_id
* integration_jobs.status plus next_run_at

---

## 24.3 Progress Tracking Performance

Problem:

* Video progress can create frequent writes.

Solution:

* Throttle progress updates.
* Save periodically, not every second.
* Save on pause.
* Save near unload where reliable.
* Only update if position changed meaningfully.
* Store rollups for dashboard rendering.

---

## 24.4 Video Performance

* Use Mux player or compatible HLS player.
* Lazy-load video player on video pages.
* Use thumbnails for lists.
* Avoid loading full video player on dashboard cards.
* Show processing states for unavailable videos.
* Avoid sending playback tokens until user actually opens a video.

---

## 24.5 Admin Performance

* Paginate video, member, lead, and purchase lists.
* Add search and filters.
* Avoid loading all users or all progress records at once.
* Use server-side filtering.
* Keep migration views lightweight.

---

# 25. Scalability Considerations

## 25.1 Expected MVP Scale

The architecture should comfortably support:

* Dozens to hundreds of videos.
* Hundreds to low thousands of members.
* Frequent video progress updates.
* Recurring subscription events.
* Weekly content uploads.
* Lead form submissions.
* Digital product purchases.

---

## 25.2 Scaling Path

When usage grows:

1. Add stronger database indexes.
2. Add query optimization.
3. Add more granular caching.
4. Move heavy jobs to a dedicated queue provider.
5. Add Sentry or equivalent error monitoring.
6. Add analytics pipeline if needed.
7. Add concurrency/session controls for video if abuse appears.
8. Add advanced reporting outside transactional database if needed.

---

## 25.3 What Scales Well by Default

* Vercel scales web traffic.
* Mux scales video delivery.
* Stripe scales payments.
* Supabase PostgreSQL scales well for the expected early workload.
* Resend scales transactional email.
* Calendly and Zoom handle scheduling/meeting infrastructure externally.

---

## 25.4 Likely Bottlenecks

Potential future bottlenecks:

* High-frequency progress writes.
* Complex dashboard queries.
* Admin member list queries.
* Integration job retries.
* Large analytics queries in primary database.
* Overly broad RLS policies.
* Missing indexes on entitlement checks.

Mitigation:

* Throttle writes.
* Add indexes early.
* Keep dashboard queries focused.
* Use background jobs.
* Avoid analytics-heavy queries in request paths.
* Periodically review slow queries.

---

# 26. Data Flow Examples

## 26.1 Member Watches Protected Video

1. User logs in.
2. User opens dashboard.
3. Server loads accessible content based on subscription.
4. User clicks video.
5. Server checks entitlement.
6. Client requests playback token.
7. Server checks entitlement again.
8. Server generates signed Mux playback access.
9. Client plays video.
10. Client sends throttled progress updates.
11. Server saves progress.
12. Course progress is recalculated.
13. Certificate job is queued if course completed.

---

## 26.2 User Buys Membership

1. User chooses plan.
2. Server validates plan price.
3. Stripe Checkout Session is created.
4. User completes checkout.
5. Stripe sends webhook.
6. Webhook stores event.
7. Webhook updates subscription.
8. User gains entitlement.
9. Confirmation email job is created.
10. Dashboard shows unlocked content.

---

## 26.3 User Buys Ebook

1. User chooses product.
2. Server validates product.
3. Stripe Checkout Session is created.
4. User pays.
5. Stripe webhook confirms payment.
6. Purchase record becomes paid.
7. Confirmation email is sent.
8. Product appears in dashboard.
9. User requests download.
10. Server verifies ownership.
11. Server returns signed Supabase Storage URL.

---

## 26.4 Visitor Submits VIP Lead

1. Visitor submits VIP form.
2. Server validates input.
3. Rate-limit/spam check runs.
4. Lead is stored.
5. Admin notification email job is queued.
6. GoHighLevel sync job is queued.
7. User sees success message.
8. Job processor syncs lead to GoHighLevel.
9. Lead sync status updates.

---

# 27. Security Review Checklist

Before launch:

* Supabase RLS enabled on sensitive tables.
* Stripe webhook signature verified.
* Mux webhook signature verified where available.
* Mux playback uses signed access.
* Digital products use private storage.
* Download URLs are signed and short-lived.
* Admin routes are role-protected.
* Server Actions validate authorization.
* Public forms are rate-limited.
* Service role key is server-only.
* Stripe secret key is server-only.
* Mux signing key is server-only.
* GoHighLevel token is server-only.
* Error responses do not leak internals.
* Logs do not contain secrets.
* No protected data is embedded in static pages.
* No access control depends only on client UI.

---

# 28. MVP Technical Scope

The MVP should include:

1. Supabase Auth.
2. Profile management.
3. Three membership plans.
4. Monthly and yearly Stripe prices.
5. Stripe Checkout.
6. Stripe Customer Portal.
7. Stripe webhooks.
8. Local subscription sync.
9. Entitlement service.
10. Protected dashboard.
11. Admin role protection.
12. Content metadata.
13. Plan-based content access.
14. Mux video migration.
15. Signed video playback.
16. Progress tracking.
17. Resume watching.
18. Basic course completion.
19. Certificate records.
20. Digital product shop.
21. One-time Stripe purchases.
22. Secure digital product downloads.
23. Lead forms.
24. Resend emails.
25. GoHighLevel lead sync.
26. Basic admin panel.
27. Vercel cron job processor.
28. Logging and basic monitoring.

---

# 29. Explicit Non-MVP Technical Scope

Do not build in MVP unless business priorities change:

1. Native mobile apps.
2. Offline video downloads.
3. Custom video infrastructure.
4. Full DRM.
5. Community forum.
6. Advanced analytics warehouse.
7. Custom calendar scheduling.
8. Complex LMS assessments.
9. Affiliate system.
10. Multi-tenant architecture.
11. Complex role permission matrix.
12. Custom subscription proration logic outside Stripe.
13. Real-time chat.
14. AI recommendations.

---

# 30. Final Architecture Recommendation

Build the platform as a Next.js 15 modular monolith with Supabase, Stripe, Mux, Resend, Calendly, Zoom, and GoHighLevel integrations.

The most important technical rules are:

1. Stripe owns payment truth.
2. Supabase owns application data and access records.
3. Mux owns video hosting and streaming.
4. Next.js owns user experience and business orchestration.
5. Entitlement checks must be centralized.
6. Protected content must be authorized server-side.
7. Webhooks must be idempotent.
8. Admin tools must be operationally simple.
9. Background jobs should start database-backed and cron-driven.
10. Avoid extra infrastructure until the business proves the need.

This architecture gives the platform a strong MVP foundation while preserving a clean path to scale.
