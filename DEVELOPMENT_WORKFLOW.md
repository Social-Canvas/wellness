# Development Workflow

How features are built, reviewed, and shipped on this project.

## Feature Development Pipeline

Every feature follows this sequence:

```
1. Architecture review (ChatGPT)
       ↓
2. Database schema / migration (if needed)
       ↓
3. Types (domain + database)
       ↓
4. Zod validation schemas
       ↓
5. Server services (business logic)
       ↓
6. Server Actions / Route Handlers
       ↓
7. UI (Server Components first, Client where needed)
       ↓
8. Manual testing
       ↓
9. Review against PRD acceptance criteria
```

Do not skip steps. Do not build UI before authorization logic exists for protected features.

## AI Tool Responsibilities

### ChatGPT — Technical Architect

Use for:
- Schema and API design reviews
- Entitlement logic edge cases
- Security review before launch
- Milestone planning and task breakdown
- Debugging complex integration issues

Do **not** use for generating large codebases.

### Claude — Feature Generator

Use for complete modules, one at a time:
- Auth module
- Stripe billing module
- Mux video module
- Admin CRUD for a domain
- Certificate issuance

Always prefix prompts with: *"Follow AI_CONTEXT.md and PROJECT_RULES.md."*

### Cursor — Pair Programmer

Use for:
- HTML → React component conversion
- Integrating Claude-generated code
- Refactoring to match project conventions
- Fixing type errors and lint issues
- Wiring components to server actions
- Small targeted changes (Cmd+K on selected code)

## Build Order (MVP)

| Sprint | Focus |
|--------|-------|
| 0 | Project setup, env, Supabase, design system from HTML |
| 1 | Auth, middleware, dashboard layout, profiles |
| 2 | Plans, Stripe checkout, webhooks, entitlements |
| 3 | Mux upload/playback, video pages, migration tooling |
| 4 | Progress tracking, resume, course completion |
| 5 | Certificates, shop, product downloads |
| 6 | Lead forms, GHL sync, Resend emails |
| 7 | Admin panel (videos, products, leads, members) |
| 8 | Live classes (Calendly embed), coupons |
| 9 | Migration QA, security review, deployment |

Each sprint should leave the app in a deployable state.

## Branch & Deploy Strategy

- `main` → production (Vercel)
- Feature branches → Vercel Preview deployments
- Environment variables separated: local / preview / production
- Never use production secrets locally

## Database Changes

1. Write migration in `supabase/migrations/`
2. Add/update RLS policies in same migration
3. Regenerate TypeScript types
4. Update `docs/DATABASE.md` if schema doc exists
5. Test policies with anon and authenticated roles

## Webhook Development

1. Implement signature verification first
2. Store raw event in `webhook_events` before processing
3. Check idempotency by `provider + provider_event_id`
4. Process in thin handler → delegate to service
5. Enqueue non-critical work (email, GHL) to `integration_jobs`
6. Test with Stripe CLI / Mux dashboard replay

## Frontend Workflow (HTML → React)

1. Extract design tokens (colors, typography, spacing) → Tailwind config
2. Build atomic UI components (`Button`, `Input`, `Card`, etc.)
3. Build layout components (`Navbar`, `Sidebar`, `Footer`)
4. Build section components (`Hero`, `PricingTiers`, `CourseCard`, etc.)
5. Assemble pages from components — pages stay thin
6. Mock data until backend is wired

## Code Review Checklist

- [ ] Follows AI_CONTEXT.md folder structure
- [ ] No `any`, no client-side-only authorization
- [ ] Zod validation on all inputs
- [ ] Entitlement check before protected resources
- [ ] Webhook idempotency if applicable
- [ ] No secrets in client code
- [ ] Error messages user-friendly
- [ ] Loading/error states present
- [ ] Matches PRD acceptance criteria for this feature

## Prompt Template (for AI features)

```
Follow AI_CONTEXT.md and PROJECT_RULES.md.

Feature: [name]

Requirements:
- [bullet from PRD/TDD]

Database:
- [tables involved]

Deliver:
- [specific files/modules]

Do not:
- [out of scope items]
```

## When Stuck

1. Re-read PRD acceptance criteria for the feature
2. Check TDD for the intended data flow
3. Ask ChatGPT to review architecture (not code)
4. Use Cursor on the specific failing file
5. Log the decision in DECISIONS.md if you change approach
