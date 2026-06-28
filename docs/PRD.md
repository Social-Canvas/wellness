# Product Requirements Document

## Online Yoga Membership Platform

## 1. Executive Summary

The product is an online yoga membership platform that allows users to subscribe to protected yoga video content, purchase digital products, attend live classes, track their learning progress, and receive course completion certificates.

The platform will support three membership plans with monthly and yearly recurring billing through Stripe. Members will receive access to content based on their active plan. The system must protect premium video content from unauthorized access, downloads, and public link sharing by using secure video streaming through Mux.

The platform will also include an admin panel for managing content, videos, digital products, coupons, live class links, lead forms, and member access. Existing yoga video content, currently totaling 57 videos and approximately 24 hours, will be migrated into the new platform.

The platform will be built using Next.js 15 App Router, TypeScript, Tailwind CSS, Shadcn UI, Supabase, Stripe, Mux, Vercel, Resend, Calendly, Zoom, and GoHighLevel.

---

## 2. Business Goals

### 2.1 Primary Goals

1. Create a secure paid membership platform for yoga video content.
2. Enable recurring revenue through monthly and yearly subscriptions.
3. Increase customer lifetime value through yearly plans, digital products, live classes, and premium offers.
4. Reduce manual administrative work for managing members, payments, videos, certificates, and leads.
5. Provide a professional, easy-to-use dashboard for members.
6. Protect paid content from unauthorized access, downloads, and link sharing.
7. Integrate with existing marketing, scheduling, and CRM tools.

### 2.2 Secondary Goals

1. Improve lead capture for VIP programs, retreats, private events, and free taster sessions.
2. Support weekly content uploads without developer involvement.
3. Enable future expansion into courses, bundles, challenges, events, retreats, and premium coaching.
4. Improve retention through progress tracking, resume watching, certificates, and live class participation.
5. Provide a scalable technical foundation with low infrastructure cost.

---

## 3. User Personas

### 3.1 Free Visitor

A person browsing the website who is interested in yoga content but has not registered or purchased anything.

Needs:

* Understand available memberships and offers.
* Preview public content.
* Submit lead forms.
* Join a free taster session.
* Purchase products or subscribe easily.

### 3.2 Registered Free User

A user who has created an account but does not have an active paid membership.

Needs:

* View account dashboard.
* See locked content with upgrade prompts.
* Purchase a membership or digital product.
* Access free or purchased content.
* Register interest in live classes, retreats, or VIP offers.

### 3.3 Paid Member

A user with an active Stripe subscription.

Needs:

* Access protected video content based on their plan.
* Resume videos from the last watched position.
* Track progress across courses or video collections.
* Receive certificates after completion.
* Manage subscription billing, upgrades, downgrades, and cancellations.
* Access eligible live classes or exclusive content.

### 3.4 Digital Product Customer

A user who purchases ebooks or one-time digital products without necessarily having a subscription.

Needs:

* Purchase one-time digital products.
* Access purchased files securely.
* Receive confirmation and access emails.
* Re-download purchased products from their dashboard.

### 3.5 Admin / Content Manager

A business owner or staff member responsible for managing the platform.

Needs:

* Upload and organize weekly video content.
* Manage videos, categories, plans, products, coupons, and live class details.
* View members and subscription status.
* Review lead form submissions.
* Issue or review certificates.
* Manage migrated video library.

### 3.6 Super Admin / Platform Owner

The primary business owner or technical administrator.

Needs:

* Full access to all admin functionality.
* Configure plans, integrations, platform settings, and user roles.
* Monitor revenue, subscriptions, content engagement, and platform health.
* Manage access control and operational workflows.

---

## 4. User Roles

### 4.1 Public Visitor

Permissions:

* View public marketing pages.
* View membership plan information.
* Submit lead forms.
* Start checkout.
* Register or log in.

Restrictions:

* Cannot access protected videos.
* Cannot access purchased products.
* Cannot access dashboard features.

### 4.2 Authenticated User

Permissions:

* Access personal dashboard.
* View account details.
* Purchase subscriptions and digital products.
* Access free content, if available.
* Submit lead forms.

Restrictions:

* Cannot access paid plan content without active entitlement.
* Cannot access admin panel.

### 4.3 Active Member

Permissions:

* Access videos included in their membership plan.
* Track progress.
* Resume watching.
* Receive certificates after completing eligible content.
* Manage subscription through Stripe customer portal.
* Access eligible member-only resources.

Restrictions:

* Cannot access content outside their plan.
* Cannot download protected videos.
* Cannot share playback URLs.

### 4.4 Digital Product Buyer

Permissions:

* Access purchased digital products.
* Download or view purchased files according to product rules.
* View purchase history.

Restrictions:

* Cannot access membership content unless subscribed.
* Cannot access products they have not purchased.

### 4.5 Admin

Permissions:

* Manage content, videos, digital products, live classes, coupons, and leads.
* Upload weekly content.
* View member records and subscriptions.
* View purchase history and completion data.
* Manage certificates.

Restrictions:

* Cannot alter system-level settings unless granted Super Admin access.

### 4.6 Super Admin

Permissions:

* Full platform administration.
* Manage user roles.
* Configure integrations.
* Manage business settings.
* Access all admin reports and platform controls.

---

## 5. Functional Requirements

## 5.1 Authentication and Accounts

### Requirements

1. Users must be able to register using email and password.
2. Users must be able to log in and log out securely.
3. Users must be able to reset forgotten passwords.
4. Users must have a member dashboard after authentication.
5. User accounts must be linked to Stripe customers where applicable.
6. User profiles must store basic account information.
7. Role-based access must support public users, members, admins, and super admins.

### Notes

Supabase Auth will be used for authentication. User-specific platform data will be stored in Supabase PostgreSQL.

---

## 5.2 Membership Plans and Subscriptions

### Requirements

1. The platform must support three membership plans.
2. Each plan must support monthly and yearly billing.
3. Stripe must handle recurring subscriptions.
4. Users must be able to subscribe to a plan.
5. Users must be able to upgrade their plan.
6. Users must be able to downgrade their plan.
7. Users must be able to cancel their subscription.
8. Users must retain access until the end of the paid billing period after cancellation.
9. Yearly subscriptions must be supported.
10. The platform must enforce a no-refund policy in the product experience and checkout/support messaging.
11. Subscription state must be synchronized from Stripe webhooks.
12. Plan access must depend on the user’s current subscription status and plan entitlement.

### Subscription Statuses

The platform should account for at least the following states:

* active
* trialing, only if trials are introduced
* past_due
* unpaid
* canceled
* incomplete
* incomplete_expired
* paused, only if enabled in Stripe

### Notes

Stripe should be treated as the source of truth for payments and subscription lifecycle events. The local database should store synchronized subscription state for fast authorization checks.

---

## 5.3 Plan-Based Content Access

### Requirements

1. Videos and courses must be associated with one or more membership plans.
2. Users may only access content included in their active plan.
3. Locked content should be visible with clear upgrade messaging, unless intentionally hidden.
4. Admins must be able to assign content access rules.
5. Access checks must happen server-side.
6. Expired or canceled users must lose access after their paid period ends.
7. Users with upgraded plans must gain access after Stripe confirms subscription changes.
8. Users with downgraded plans must retain or lose access according to Stripe billing period rules and configured entitlement behavior.

### Notes

Content access should be entitlement-based rather than hardcoded into pages. This keeps plan changes maintainable.

---

## 5.4 Secure Video Streaming

### Requirements

1. The platform must migrate 57 existing videos totaling approximately 24 hours.
2. Videos must be hosted and streamed through Mux.
3. Videos must not expose raw downloadable files.
4. Playback must be protected from public link sharing.
5. Only authorized users may request playback access.
6. Playback URLs or tokens must be short-lived.
7. Users must not be able to access videos outside their plan.
8. Admins must be able to upload or register new weekly video content.
9. Video metadata must include title, description, duration, thumbnail, category, access plan, and publish status.
10. The platform should support draft, published, archived, and scheduled video states.

### Notes

The goal is practical content protection, not impossible DRM guarantees. The system should prevent casual downloading, public URL sharing, and unauthorized playback. For stronger protection, Mux signed playback and strict server-side authorization should be used.

---

## 5.5 Member Dashboard

### Requirements

1. Members must have a dashboard after login.
2. The dashboard must show available courses or video libraries based on the user’s plan.
3. The dashboard must show recently watched videos.
4. The dashboard must allow users to resume watching.
5. The dashboard must show progress by course, collection, or program.
6. The dashboard must show certificates earned.
7. The dashboard must show purchased digital products.
8. The dashboard must provide access to subscription management.
9. The dashboard should show live class opportunities or upcoming sessions, if applicable.

---

## 5.6 Progress Tracking and Resume Watching

### Requirements

1. The platform must track video watch progress per user.
2. The platform must store the last watched timestamp for each video.
3. Users must be able to resume from their last watched position.
4. The platform must detect completed videos.
5. Completion rules should be configurable, for example 90% watched.
6. Progress should roll up to course or collection completion.
7. Progress data must belong only to the authenticated user.
8. Admins should be able to view high-level completion data.

### Notes

Progress tracking should be resilient to users closing the browser, switching devices, or watching in multiple sessions.

---

## 5.7 Certificates

### Requirements

1. The platform must automatically issue certificates after eligible course completion.
2. Certificate eligibility must be based on defined completion rules.
3. Users must be able to view certificates in their dashboard.
4. Certificates must include user name, course name, completion date, and certificate ID.
5. Certificates should be unique and verifiable.
6. Admins should be able to view issued certificates.
7. The platform should prevent duplicate certificates for the same user and course.
8. Certificates should be downloadable as PDF in a future or initial release depending on scope.

### Notes

Certificate generation should be based on course completion events, not manual admin work.

---

## 5.8 Coupons and Discounts

### Requirements

1. Admins must be able to create or configure coupons and discount codes.
2. Coupons must work with Stripe checkout where applicable.
3. Coupons may apply to subscriptions, one-time purchases, or both.
4. Coupons may support percentage discounts or fixed amount discounts.
5. Coupons may have expiration dates.
6. Coupons may have usage limits.
7. Coupons may be plan-specific or product-specific.
8. The system must display applied discounts clearly during checkout.
9. Invalid, expired, or ineligible coupons must be rejected with clear messaging.

### Notes

Stripe should manage payment-level discount enforcement. The platform may store coupon metadata for display and admin visibility.

---

## 5.9 Shop and Digital Products

### Requirements

1. The platform must include a shop for ebooks and one-time digital products.
2. Users must be able to purchase digital products through Stripe.
3. Purchased digital products must appear in the user dashboard.
4. Digital product access must be restricted to purchasers.
5. Digital files must be stored securely using Supabase Storage or another approved secure storage mechanism.
6. Download links must not be publicly accessible.
7. Download URLs must be signed or time-limited.
8. Users must receive a purchase confirmation email.
9. Admins must be able to create, edit, publish, unpublish, and archive digital products.
10. Products must support title, description, price, cover image, file, status, and metadata.

### Notes

Digital products should be separate from subscription entitlements so users can buy products without becoming members.

---

## 5.10 Live Classes with Calendly and Zoom

### Requirements

1. The platform must support live class scheduling through Calendly.
2. Zoom links must be used for live class sessions.
3. Users must be able to view or register for live classes.
4. The platform should support member-only live classes where needed.
5. The platform should support free taster session booking.
6. The platform should capture relevant booking or registration data.
7. Users should receive confirmation and reminder emails through Calendly, Zoom, Resend, or a combination based on integration design.
8. Admins should be able to manage live class information shown on the platform.

### Notes

Calendly and Zoom should remain the scheduling and meeting system of record unless a deeper custom scheduling system is required later.

---

## 5.11 Lead Forms

### Requirements

The platform must include lead forms for:

1. VIP enquiries.
2. Retreat enquiries.
3. Private event enquiries.
4. Free taster enquiries.

Each lead form must:

1. Capture name, email, phone if required, message, and form-specific fields.
2. Validate required fields.
3. Store submissions in the database.
4. Send notification emails to the business.
5. Send confirmation emails to the user where appropriate.
6. Push lead data to GoHighLevel.
7. Protect against spam and abuse.
8. Provide clear success and error states.

---

## 5.12 GoHighLevel Integration

### Requirements

1. Lead form submissions must be sent to GoHighLevel.
2. Relevant user events may be sent to GoHighLevel, such as new registration, membership purchase, product purchase, cancellation, or VIP enquiry.
3. Failed sync attempts must be logged.
4. The system should support retrying failed GoHighLevel syncs.
5. Admins should be able to identify whether a lead was successfully synced.
6. Sensitive data sent to GoHighLevel must be limited to necessary business data.

### Notes

GoHighLevel should support marketing automation and CRM workflows. The core platform should not depend on GoHighLevel availability for critical user flows.

---

## 5.13 Admin Panel

### Requirements

1. Admins must be able to access a protected admin panel.
2. Admins must be able to manage video content.
3. Admins must be able to upload or register weekly videos.
4. Admins must be able to assign videos to plans, categories, courses, or collections.
5. Admins must be able to manage digital products.
6. Admins must be able to manage coupons or Stripe coupon references.
7. Admins must be able to view members.
8. Admins must be able to view subscription status.
9. Admins must be able to view lead submissions.
10. Admins must be able to view product purchases.
11. Admins must be able to view certificates.
12. Admins must be able to manage content publish status.
13. Admins must be able to schedule or publish weekly content.
14. Admin access must be role-protected.

### Notes

The admin panel should start simple and operationally focused. Advanced analytics can be deferred.

---

## 5.14 Email Notifications

### Requirements

The platform must send transactional emails for:

1. Account registration, where applicable.
2. Password reset through Supabase Auth.
3. Subscription confirmation.
4. Subscription cancellation confirmation.
5. Digital product purchase confirmation.
6. Lead form confirmation.
7. Admin lead notification.
8. Certificate issued notification.
9. Important account or access updates.

### Notes

Resend will be used for platform-managed transactional emails. Supabase Auth may handle authentication-related emails unless customized.

---

## 5.15 Video Migration

### Requirements

1. All 57 existing videos must be migrated.
2. Metadata must be collected for each video.
3. Each migrated video must be uploaded or imported into Mux.
4. Each video must be assigned to the correct plan, category, course, or collection.
5. Each video must be tested for playback.
6. Each video must be tested for access control.
7. Thumbnails and durations must be verified.
8. Any missing metadata must be flagged before launch.

### Notes

Migration should be treated as a dedicated launch milestone, not as an afterthought.

---

## 6. Non-Functional Requirements

## 6.1 Security

1. All protected routes must require authentication.
2. All paid content access must be checked server-side.
3. Video playback authorization must not rely only on client-side checks.
4. Admin routes must require admin role authorization.
5. Stripe webhook signatures must be verified.
6. GoHighLevel webhook or API credentials must be stored securely.
7. Mux signing keys must be stored securely.
8. Supabase Row Level Security should be used for sensitive user-owned data.
9. Download links for digital products must be signed or time-limited.
10. Sensitive environment variables must not be exposed to the client.
11. User payment details must not be stored directly in the platform database.

---

## 6.2 Performance

1. Public marketing pages should load quickly.
2. Dashboard pages should avoid unnecessary client-side data fetching.
3. Video pages should load metadata quickly and defer heavy playback work to the player.
4. The platform should use pagination or lazy loading for large content libraries.
5. Admin lists should support search and filtering as content grows.
6. The platform should be optimized for Vercel deployment.

---

## 6.3 Scalability

1. The platform should support growth from initial launch to thousands of members.
2. Subscription access checks should remain efficient as content and users grow.
3. Progress tracking should be designed for frequent updates without excessive writes.
4. Digital product access should scale independently from membership access.
5. Integrations should be decoupled where possible to avoid blocking user-facing flows.

---

## 6.4 Reliability

1. Stripe webhook processing must be idempotent.
2. Failed integration events should be logged.
3. GoHighLevel failures should not break form submission.
4. Mux processing delays should be handled gracefully.
5. Email delivery failures should be logged.
6. Users should receive clear error messages for payment or access issues.
7. Admin content changes should not accidentally expose private content.

---

## 6.5 Maintainability

1. The codebase should separate public website, member dashboard, admin panel, and integration logic clearly.
2. Business rules should not be duplicated across the frontend.
3. Access control should be centralized.
4. Subscription and entitlement logic should be explicit and easy to test.
5. Database tables should have clear ownership and naming.
6. Integration code should be isolated by provider.

---

## 6.6 Compliance and Privacy

1. The platform must avoid storing raw payment card information.
2. Users should be informed of the no-refund policy before purchase.
3. User data should be collected only where needed.
4. Lead forms should include consent language where appropriate.
5. Admin access to user data should be limited to operational needs.
6. The platform should be designed to support privacy requests, account deletion, and data export if required.

---

## 6.7 Accessibility

1. Public pages should follow common accessibility best practices.
2. Forms should have proper labels and validation messages.
3. Buttons and navigation should be keyboard accessible.
4. Video pages should support captions where available.
5. Color contrast should be readable.

---

## 6.8 Developer Experience

1. The platform should be easy to develop locally.
2. Environment variables should be clearly documented.
3. Integration setup should be documented.
4. Database migrations should be version-controlled.
5. Admin workflows should avoid requiring developer intervention.
6. The system should favor simple architecture over unnecessary microservices.

---

## 7. User Stories

## 7.1 Visitor Stories

1. As a visitor, I want to view membership plans so I can choose the right option.
2. As a visitor, I want to submit a retreat enquiry so I can learn more about upcoming retreats.
3. As a visitor, I want to book a free taster session so I can try the service before paying.
4. As a visitor, I want to view digital products so I can purchase ebooks without subscribing.
5. As a visitor, I want to understand which content is included in each plan.

---

## 7.2 Member Stories

1. As a member, I want to log in securely so I can access my dashboard.
2. As a member, I want to view only the videos included in my plan.
3. As a member, I want to resume a video where I left off.
4. As a member, I want to see my progress so I know how much I have completed.
5. As a member, I want to receive a certificate after completing a course.
6. As a member, I want to manage my subscription without contacting support.
7. As a member, I want to upgrade my plan so I can unlock more content.
8. As a member, I want to cancel my subscription and keep access until my billing period ends.
9. As a member, I want to join eligible live classes.

---

## 7.3 Digital Product Customer Stories

1. As a customer, I want to buy an ebook securely.
2. As a customer, I want to access purchased products from my dashboard.
3. As a customer, I want to receive a confirmation email after purchase.
4. As a customer, I want my download link to work securely and reliably.

---

## 7.4 Admin Stories

1. As an admin, I want to upload weekly yoga videos without developer help.
2. As an admin, I want to assign videos to plans so members get correct access.
3. As an admin, I want to publish or unpublish content.
4. As an admin, I want to manage ebooks and digital products.
5. As an admin, I want to view leads from VIP, retreats, private events, and free taster forms.
6. As an admin, I want leads to sync to GoHighLevel automatically.
7. As an admin, I want to view subscriptions and member status.
8. As an admin, I want to verify migrated videos before launch.
9. As an admin, I want to view certificates issued to members.

---

## 8. Acceptance Criteria

## 8.1 Authentication

1. Given a visitor creates an account, when registration succeeds, then they can log in and access their dashboard.
2. Given a user is logged out, when they try to access protected dashboard pages, then they are redirected to login.
3. Given a user forgets their password, when they request a reset, then they receive a password reset email.

---

## 8.2 Membership and Billing

1. Given a user selects a monthly or yearly plan, when checkout succeeds, then their subscription is created in Stripe.
2. Given Stripe confirms an active subscription, when the user accesses the dashboard, then the correct plan access is applied.
3. Given a user cancels a subscription, when cancellation is complete, then access remains until the end of the paid billing period.
4. Given a user upgrades their plan, when Stripe confirms the change, then the user receives the upgraded access.
5. Given a user has no active entitlement, when they open paid content, then they see locked content or an upgrade prompt.
6. Given a subscription webhook is received more than once, when processed, then the system does not duplicate or corrupt subscription records.

---

## 8.3 Video Access

1. Given a user has the correct active plan, when they open an included video, then playback is available.
2. Given a user does not have the required plan, when they open a protected video, then playback is denied.
3. Given a playback URL is shared with another user, when the unauthorized user tries to access it, then playback is denied or the token expires.
4. Given an admin publishes a new video, when it is assigned to a plan, then eligible members can access it.
5. Given a video is archived or unpublished, when a member attempts to access it, then it is unavailable.

---

## 8.4 Progress Tracking

1. Given a member watches a video, when progress is saved, then the dashboard reflects updated progress.
2. Given a member exits a video and returns later, when they resume, then playback starts near the last saved position.
3. Given a member watches enough of a video to meet completion criteria, when progress is processed, then the video is marked complete.
4. Given all required videos in a course are complete, when completion is evaluated, then the course is marked complete.

---

## 8.5 Certificates

1. Given a member completes an eligible course, when completion rules are met, then a certificate is issued automatically.
2. Given a certificate already exists for a user and course, when completion is evaluated again, then no duplicate certificate is created.
3. Given a member has earned certificates, when they open the dashboard, then certificates are visible.
4. Given a certificate has an ID, when viewed, then it can be uniquely identified.

---

## 8.6 Digital Products

1. Given a user purchases an ebook, when payment succeeds, then the product appears in their dashboard.
2. Given a user has not purchased a product, when they try to access its file, then access is denied.
3. Given a user opens a product download link, when the link has expired, then they must request or generate a new secure link.
4. Given a purchase succeeds, when the system sends confirmation, then the user receives an email.

---

## 8.7 Coupons

1. Given a valid coupon is entered, when checkout is created, then the discount is applied.
2. Given an expired coupon is entered, when checkout is attempted, then the coupon is rejected.
3. Given a coupon is limited to a specific plan or product, when used elsewhere, then it is rejected.
4. Given a coupon has reached its usage limit, when used again, then it is rejected.

---

## 8.8 Live Classes

1. Given a user wants to book a class, when they select a Calendly booking option, then they can complete scheduling.
2. Given a session uses Zoom, when booking is confirmed, then the user receives or can access the Zoom details according to the scheduling flow.
3. Given a live class is member-only, when a non-member attempts access, then they are prompted to subscribe or log in.

---

## 8.9 Lead Forms

1. Given a visitor submits a VIP enquiry, when required fields are valid, then the lead is stored and sent to GoHighLevel.
2. Given GoHighLevel is unavailable, when a form is submitted, then the form still succeeds and the failed sync is logged.
3. Given a form submission succeeds, when configured, then the user receives a confirmation email.
4. Given a form submission succeeds, when configured, then the admin receives a notification email.
5. Given spam-like behavior is detected, when a form is submitted, then the system blocks or rate-limits the request.

---

## 8.10 Admin Panel

1. Given an admin logs in, when they access the admin panel, then admin tools are available.
2. Given a non-admin logs in, when they access the admin panel, then access is denied.
3. Given an admin creates a digital product, when it is published, then users can purchase it.
4. Given an admin uploads weekly content, when processing completes, then the content can be published to eligible members.
5. Given an admin changes access rules, when users view content, then the updated rules are enforced.

---

## 9. Success Metrics

## 9.1 Business Metrics

1. Number of free account registrations.
2. Visitor-to-member conversion rate.
3. Monthly recurring revenue.
4. Yearly plan conversion rate.
5. Subscription churn rate.
6. Upgrade rate from lower plans to higher plans.
7. Digital product sales.
8. Coupon usage rate.
9. Lead form conversion rate.
10. Free taster booking conversion rate.
11. VIP, retreat, and private event enquiry volume.

---

## 9.2 Product Engagement Metrics

1. Number of active members.
2. Average videos watched per member.
3. Course completion rate.
4. Certificate issuance rate.
5. Resume watching usage.
6. Live class booking rate.
7. Member dashboard usage.
8. Repeat visits per member.
9. Average watch progress per video.
10. Most viewed content categories.

---

## 9.3 Operational Metrics

1. Time required to upload weekly content.
2. Number of support requests related to access issues.
3. Failed payment rate.
4. Failed webhook processing count.
5. Failed GoHighLevel sync count.
6. Failed email delivery count.
7. Video processing failures.
8. Admin content publishing errors.
9. Migration completion percentage.

---

## 10. Assumptions

1. The platform will initially support one primary brand/business.
2. Three membership plans are known or will be finalized before Stripe setup.
3. Monthly and yearly prices will be configured in Stripe.
4. Stripe will be the source of truth for payments and subscriptions.
5. Supabase Auth will be used for user authentication.
6. Mux will be used for secure video hosting and playback.
7. Existing videos are available in a format that can be uploaded or migrated to Mux.
8. Existing video metadata may need cleanup before migration.
9. Calendly and Zoom will remain external systems for scheduling and live meetings.
10. GoHighLevel will be used as the CRM and marketing automation platform.
11. The platform will not store raw credit card details.
12. No-refund policy messaging will be approved by the business before launch.
13. Admins will upload weekly content after launch.
14. Initial analytics will focus on operational and product engagement metrics, not advanced BI dashboards.
15. Digital products are one-time purchases separate from membership subscriptions.

---

## 11. Risks

## 11.1 Video Protection Risk

No web-based video platform can fully prevent screen recording. The goal is to prevent unauthorized access, downloads, and link sharing.

Mitigation:

* Use Mux secure playback.
* Use server-side authorization.
* Use short-lived playback tokens.
* Avoid exposing raw video files.
* Monitor suspicious access patterns in future releases.

---

## 11.2 Stripe Synchronization Risk

Subscription state may become inaccurate if webhooks fail or are not processed correctly.

Mitigation:

* Verify webhook signatures.
* Make webhook handlers idempotent.
* Log events.
* Store Stripe event IDs.
* Add admin visibility for subscription state.
* Provide a manual reconciliation process if needed.

---

## 11.3 Migration Risk

Existing videos may have missing metadata, inconsistent quality, or upload issues.

Mitigation:

* Create a migration checklist.
* Validate each video after upload.
* Track migration status per video.
* Confirm access rules before launch.
* Perform user acceptance testing on migrated content.

---

## 11.4 Integration Reliability Risk

GoHighLevel, Calendly, Zoom, Stripe, Mux, or Resend may experience downtime or API failures.

Mitigation:

* Do not block critical user flows on non-critical integrations.
* Log integration failures.
* Retry failed syncs where appropriate.
* Provide clear fallback behavior.

---

## 11.5 Admin Complexity Risk

A complex admin panel may delay launch.

Mitigation:

* Build only essential admin workflows first.
* Use simple forms and tables.
* Defer advanced reporting and bulk editing.
* Prioritize weekly content upload, content publishing, and access management.

---

## 11.6 Access Control Risk

Incorrect access rules could expose paid content or block valid members.

Mitigation:

* Centralize entitlement checks.
* Use server-side authorization.
* Add admin previews or validation.
* Test each plan before launch.
* Use Row Level Security where appropriate.

---

## 11.7 Progress Tracking Accuracy Risk

Progress may not be perfectly accurate due to network issues, browser behavior, or users switching devices.

Mitigation:

* Save progress periodically.
* Save progress on pause or exit where possible.
* Use reasonable completion thresholds.
* Avoid excessive database writes.
* Treat progress tracking as helpful guidance rather than financial entitlement.

---

## 11.8 Certificate Abuse Risk

Users may attempt to trigger completion without genuinely watching content.

Mitigation:

* Require meaningful watch thresholds.
* Track progress server-side.
* Prevent duplicate certificates.
* Add certificate verification IDs.
* Consider stronger validation in future versions.

---

## 12. Future Scope

The following features are not required for initial launch unless explicitly prioritized later.

### 12.1 Advanced Learning Features

1. Structured multi-week courses.
2. Yoga challenges.
3. Quizzes or assessments.
4. Assignments or reflections.
5. Personalized learning paths.
6. Recommended videos based on progress.

### 12.2 Community Features

1. Member community area.
2. Comments on videos.
3. Discussion boards.
4. Member groups.
5. Live chat during classes.

### 12.3 Advanced Commerce

1. Bundles.
2. Gift cards.
3. Affiliate/referral program.
4. Cart functionality for multiple digital products.
5. Order bump or upsell flows.
6. Limited-time promotions.

### 12.4 Advanced Admin and Analytics

1. Revenue dashboard.
2. Content performance analytics.
3. Member retention analytics.
4. Cohort reports.
5. Exportable reports.
6. Bulk content editing.
7. Advanced role permissions.

### 12.5 Mobile and App Experience

1. Progressive Web App support.
2. Native mobile app.
3. Offline viewing, only if business and content protection requirements allow.
4. Push notifications.

### 12.6 Deeper Integrations

1. Advanced GoHighLevel automation events.
2. Two-way CRM synchronization.
3. Zoom attendance tracking.
4. Calendly booking sync into the internal dashboard.
5. Advanced email segmentation.

### 12.7 Stronger Video Protection

1. DRM-level protection if required.
2. Watermarked playback.
3. Device limits.
4. Concurrent stream limits.
5. Suspicious sharing detection.

---

## 13. MVP Scope Recommendation

The recommended MVP should include:

1. Authentication and member accounts.
2. Three membership plans with monthly and yearly Stripe subscriptions.
3. Stripe checkout and customer portal.
4. Stripe webhook subscription synchronization.
5. Plan-based video access.
6. Mux video migration and protected playback.
7. Member dashboard.
8. Resume watching and basic progress tracking.
9. Basic automatic certificates.
10. Digital product shop with one-time purchases.
11. Secure digital product access.
12. Lead forms for VIP, retreats, private events, and free taster.
13. GoHighLevel lead sync.
14. Resend transactional emails.
15. Basic admin panel for videos, products, leads, and content publishing.
16. Calendly and Zoom links or embeds for live classes.

The MVP should avoid overbuilding advanced analytics, complex community features, custom scheduling, native mobile apps, and advanced CRM automation until the core subscription and content platform is stable.

---

## 14. Out of Scope for MVP

The following should not be included in the initial MVP unless business priorities change:

1. Native mobile apps.
2. Offline video downloads.
3. Full DRM implementation.
4. Community forum.
5. Complex course assessments.
6. Advanced analytics dashboards.
7. Affiliate system.
8. Referral rewards.
9. Multi-tenant support.
10. Custom-built calendar scheduling.
11. Full learning management system functionality.
12. AI-generated recommendations.
13. Complex email marketing automation inside the platform.

---

## 15. Launch Readiness Criteria

The platform should be considered ready for launch when:

1. All 57 existing videos are migrated and verified.
2. Each video has correct metadata and plan access.
3. Stripe subscriptions work for monthly and yearly billing.
4. Upgrade, downgrade, and cancellation flows are tested.
5. Webhooks correctly update subscription state.
6. Protected videos cannot be accessed by unauthorized users.
7. Member dashboard shows correct content and progress.
8. Digital product purchases work end-to-end.
9. Lead forms store submissions and sync to GoHighLevel.
10. Admin can upload and publish weekly content.
11. Emails are delivered for key transactional flows.
12. Admin and member permissions are tested.
13. No-refund policy is visible before purchase.
14. Core pages are responsive on mobile and desktop.
15. Backup and rollback procedures are understood.
16. Production environment variables are configured securely.
17. Final user acceptance testing is completed by the business owner.

---
