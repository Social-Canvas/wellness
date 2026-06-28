# Claude Instructions

Read these files before generating code:

- AGENTS.md
- AI_CONTEXT.md
- PROJECT_RULES.md
- DEVELOPMENT_WORKFLOW.md
- DECISIONS.md
- TASKS.md

Rules:

- Follow the architecture exactly.
- Do not introduce Express.
- Do not introduce Shopify.
- Do not split frontend/backend repos.
- Generate one feature at a time.
- Prefer Server Components.
- Use Client Components only when needed.
- Use TypeScript strictly.
- Never use `any`.
- Use Zod validation.
- Use Supabase through approved clients only.
- Never expose service-role keys.
- Keep output file-based and production-ready.

Before writing code, briefly list:
1. Files you will create
2. Files you will modify
3. Assumptions
4. What is out of scope