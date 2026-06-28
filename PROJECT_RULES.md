# Project Rules — Senior Engineer Guidelines

All AI-generated and hand-written code must follow these rules.

## Language & Types

- **Always TypeScript.** Never JavaScript.
- **Never use `any`** unless explicitly justified with a comment.
- Use strict mode.
- Infer types where possible; explicit return types on service functions.
- Use `interface` for API contracts; `type` for unions.
- Generate/maintain Supabase database types.

## Architecture

- **No Express.** Next.js Route Handlers + Server Actions only.
- **Modular monolith** in one repo — do not split frontend/backend repos.
- **Feature folders** under `src/features/` — not layer-only organization.
- **Server Components by default.** Client Components only when interactivity requires it.
- **No business logic in page files** — pages fetch via queries/services and render.
- **No business logic in generic UI components.**

## Data & Validation

- **Always use Zod** for form, Server Action, and API input validation.
- **Always use React Hook Form** for forms.
- **Always validate on the server** — client validation is UX only.
- **Never trust client input** for price IDs, plan IDs, user IDs, or roles.
- **Never inline SQL** in components or actions — use Supabase client in services.
- **Stripe is payment source of truth** — sync via webhooks, don't call Stripe per access check.

## Server Actions

- Prefer Server Actions for UI-originated mutations.
- Route Handlers only for: webhooks, external callbacks, cron, raw-body endpoints.
- Every action: validate → auth → authorize → service → revalidate → typed result.
- No complex business logic inside actions — delegate to `server/services/`.

## Authorization

- **Centralize entitlement checks** in `entitlementService` (or equivalent).
- Never authorize from client state alone.
- Check entitlements server-side before playback tokens, downloads, and protected data.
- Admin routes: check role in layout **and** in sensitive mutations.
- Use RLS on user-owned tables (`video_progress`, `purchases`, `certificates`, etc.).

## Payments & Access

- **Do not grant membership access from checkout redirect alone.**
- Webhook confirmation required for subscriptions and product purchases.
- Use Stripe Customer Portal for upgrade/downgrade/cancel in MVP.
- No refunds in product UX; represent disputes in DB if they occur.

## Video & Files

- **Mux for all member video playback** — no Supabase Storage for protected videos.
- Signed playback only; short-lived tokens.
- Digital products: private Supabase bucket + signed download URLs after ownership check.
- Never expose permanent public URLs for paid content.

## Integrations

- Webhooks: verify signatures, store event ID, process idempotently.
- GHL/email failures: log + retry via `integration_jobs` — do not fail user-facing flows.
- Never expose service role keys, signing keys, or webhook secrets to the client.

## React & UI

- Keep components under ~200 lines; extract when larger.
- One component, one responsibility.
- Prefer composition over prop drilling — fetch server data at route boundaries.
- No inline styles — use Tailwind.
- Use Shadcn UI; customize via variants, don't fork heavily.
- Always use `loading.tsx` and `error.tsx` for route segments where appropriate.
- Use Suspense for async boundaries.

## Code Quality

- No duplicated code — extract shared logic to `lib/` or `server/services/`.
- No magic strings — use constants in `src/constants/`.
- Environment variables via `lib/config` — never `process.env` scattered in components.
- Prefer `async/await`.
- No `console.log` in production paths — use structured logging.
- No `any`, no `@ts-ignore` without justification.

## Naming

| Kind | Convention | Example |
|------|------------|---------|
| DB tables | snake_case plural | `video_progress` |
| TS variables | camelCase | `currentPlan` |
| Components | PascalCase | `CourseCard` |
| Server actions | verb-based | `updateVideoMetadata` |
| Services | domain + Service | `entitlementService` |

## Git & Scope

- Minimal focused diffs — don't refactor unrelated code.
- Don't add features outside current task/milestone.
- Don't add tests unless requested or covering real behavior.
- Don't create markdown files unless requested.

## Definition of Done (per feature)

1. Zod schemas for all inputs
2. Server-side auth + authorization
3. Error and loading states
4. No secrets in client bundle
5. Entitlement checks for protected resources
6. Types complete
7. Follows folder structure in AI_CONTEXT.md
