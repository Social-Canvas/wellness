# Operator guide

This is the handoff for day-to-day operation of https://elevate-healthsolutions.com. A person still needs to record the Loom. The checklist at the end is the script.

## Admin login and password reset

1. Open https://elevate-healthsolutions.com/login?next=%2Fadmin
2. Sign in with the operator email.
3. If the password is not accepted, open https://elevate-healthsolutions.com/forgot-password and use the same email.
4. After the reset email, set a new password and return to `/admin`.

Do not share passwords in chat or email them as plain text.

## Content editing

Admin → Content edits homepage and shared site text, including the announcement bar. Save, then refresh the public homepage to confirm the ticker.

## Images and media

Admin image uploads accept JPEG, PNG, WebP, or GIF up to 5 MB, with alt text. Product PDFs go in the private product file bucket, up to 50 MB. Public pages only receive a signed download link after access is confirmed. Crop shapes and video settings are in `docs/MEDIA_SPECS.md`. A screenshot walkthrough is in `docs/operator-guide/README.md`.

## Promo codes

Product checkout, including the Reset, accepts Stripe promotion codes. Create the coupon and promotion code in Stripe, with a redemption limit or expiry if needed. A 100%-off code grants access as a $0 order and is not counted as revenue. Membership checkout does not accept codes.

## Products

Admin → Products edits catalog copy, price display, files, and publish state. Checkout uses the Stripe price already linked to the product. Do not type a new price into the browser and expect Stripe to change.

## PDFs

Attach the file on the product, publish the product, and confirm a entitled member sees it under Downloads. A file that is only stored in Google Drive is not a website download.

## Courses

Admin → Courses edits modules, lessons, order, and draft or published status. Members only see published lessons they are entitled to open. Super Admin demo access is separate and is described below.

## Recorded sessions

Use Admin → Recorded Sessions. See `docs/RECORDED_SESSION_WORKFLOW.md`. Uploading a file to Google Drive does not publish it.

## Live and virtual sessions

Admin → Live Sessions creates or edits a session: title, description, start time, Zoom URLs, trial checkbox, and publish state. The public $55 Live Breathwork purchase stays unavailable until a published trial session has a real future start time. Do not invent a date.

## Leads

Admin → Leads lists enquiries. Bot review flags are visible there. Do not delete a lead to “clean” reporting unless the operator has decided it is spam.

## Sales exports

Admin → Sales shows one-time revenue, transactions, and membership reporting with export. Membership renewal revenue stays in Stripe. Complimentary Reset grants and free claims are not paid orders.

## Complimentary Reset access

Admin → Members includes Complimentary Reset access. Enter the member email and grant. This writes a complimentary entitlement and does not create a Stripe order. Revoke removes only that complimentary row. A real purchase is left in place.

## Organization access codes

Existing organization codes are redeemed at `/redeem-organization-access`. Codes are configurable, can expire, and have a seat limit. Redeeming twice does not grant a second seat. Do not create a second promo code in Stripe for the same organization program.

## What Super Admin demo access means

A profile whose role is `super_admin` can open published courses, lessons, videos, downloads, recorded sessions, and membership content without buying them. That access is the stored role. It is not an email list and it does not create an order. A normal member still needs their own purchase, subscription, or complimentary entitlement.

## What still requires engineering or the client

- Email authentication records in GoDaddy, listed in `docs/EMAIL_DELIVERABILITY.md`
- Approved Terms and Refund copy, published at `/terms` and `/refund`
- Google sign-in credentials in Supabase, listed in `docs/GOOGLE_SIGN_IN.md`
- A real $47 Reset card test, only after the client authorizes it
- A real future Live Breathwork date
- Meta, GitHub, Vercel, and Supabase invites, listed in the tracker
- Google Drive files that are not already one of the published recordings

## Loom checklist

Record in this order, about 15 minutes:

1. Sign in at `/login?next=%2Fadmin` and show the password-reset page without submitting someone else's email.
2. Edit the homepage announcement and show it on the public site.
3. Open a product, a course lesson list, and a recorded session. Say that Drive upload alone does not publish.
4. Open Live Sessions and point at the date and trial fields. Do not save a fake date.
5. Open Leads and Sales export.
6. Show Complimentary Reset and say it is not a paid order.
7. Show `/terms`, `/refund`, and the cookie banner.
8. End on what the client still has to supply: legal copy, DNS, Google sign-in, and a real payment test.
