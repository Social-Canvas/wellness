# Yoga Membership Platform

Next.js 15+ membership platform for yoga video content — subscriptions, secure streaming, progress tracking, certificates, shop, and admin.

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Env validation is skipped in local development by default. Set `SKIP_ENV_VALIDATION=false` and fill in `.env.local` to test validation before production deploy.

## Environment Variables

Copy `.env.example` to `.env.local` and fill in values. Access validated env via `@/lib/config` — do not read `process.env` directly in application code.

### Public (client-safe)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Canonical app URL (e.g. `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |

### Server-only

| Variable | Description |
|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `MUX_TOKEN_ID` | Mux API token ID |
| `MUX_TOKEN_SECRET` | Mux API token secret |
| `MUX_SIGNING_KEY_ID` | Mux signed playback key ID |
| `MUX_SIGNING_PRIVATE_KEY` | Mux signed playback private key |
| `RESEND_API_KEY` | Resend email API key |
| `GHL_API_KEY` | GoHighLevel API key |
| `CRON_SECRET` | Secret for Vercel Cron job authentication |

### Optional

| Variable | Description |
|----------|-------------|
| `SKIP_ENV_VALIDATION` | Set to `true` to bypass validation (local dev only) |

## Project Structure

```
src/
  app/           # Routes and API handlers
  features/      # Domain modules
  lib/           # Config, provider clients, utilities
  server/        # Actions, queries, services, jobs, webhooks
  types/         # Database, domain, and API types
docs/            # PRD, TDD, reference HTML
```

## Documentation

- [AI_CONTEXT.md](./AI_CONTEXT.md) — architecture and conventions
- [PROJECT_RULES.md](./PROJECT_RULES.md) — coding standards
- [TASKS.md](./TASKS.md) — sprint checklist
- [docs/PRD.md](./docs/PRD.md) — product requirements
- [docs/TDD.md](./docs/TDD.md) — technical design
- [docs/reference/Sample_Platform_Demo.html](./docs/reference/Sample_Platform_Demo.html) — UI reference

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint
```
