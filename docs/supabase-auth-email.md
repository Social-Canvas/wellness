# Supabase Auth email (SMTP + templates)

Auth lifecycle emails (confirm signup, reset password, invite) are owned by **Supabase Auth**, not the membership lifecycle outbox.

## Custom SMTP via Resend

Use Resend SMTP so Auth mail uses the same verified Elevate domain as transactional app mail.

| Setting | Value |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Your Resend API key (same as `RESEND_API_KEY`) |
| Sender email | Must match a **verified** Resend domain address (same as `TRANSACTIONAL_EMAIL_FROM`) |
| Sender name | `Elevate Health Solutions` |

**Never commit the API key.** Paste it only in Supabase Dashboard → Project Settings → Auth → SMTP Settings (or via Management API with a local secret).

### Dashboard steps

1. Confirm the Elevate sender domain is **Verified** in Resend.
2. Supabase → Authentication → SMTP Settings → enable custom SMTP with the table above.
3. Disable click-tracking / link rewriting on Auth messages (Resend / ESP). Auth links must stay intact.
4. Send a test Auth email only to an allowlisted operator inbox.

## Branded templates (tracked in repo)

Copy HTML from:

- `src/emails/auth/confirm-signup.html`
- `src/emails/auth/reset-password.html`
- `src/emails/auth/invite-user.html`

into Supabase → Authentication → Email Templates.

Subjects (suggested):

- Confirm: `Confirm your Elevate account`
- Reset: `Reset your Elevate password`
- Invite: `You're invited to Elevate`

**SSR-safe links:** templates use `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=...` so the Next.js Route Handler can `verifyOtp`. Do not rely on `{{ .ConfirmationURL }}` alone — GoTrue currently returns implicit `#access_token` hashes that never reach a Route Handler. `/auth/callback` remains as a client bridge for legacy ConfirmationURL / hash redirects.

## Site URL and redirect allowlist

Set in Supabase → Authentication → URL Configuration:

| Setting | Production value |
|---|---|
| Site URL | Exact production origin of `NEXT_PUBLIC_APP_URL` (no trailing slash), currently `https://wellness-topaz-chi.vercel.app` |
| Redirect URLs | `${NEXT_PUBLIC_APP_URL}/auth/callback` |
| | `${NEXT_PUBLIC_APP_URL}/auth/callback?**` |
| | `${NEXT_PUBLIC_APP_URL}/auth/confirm` |
| | `${NEXT_PUBLIC_APP_URL}/auth/confirm?**` |
| | `${NEXT_PUBLIC_APP_URL}/reset-password` (legacy fallback) |
| Local | `http://localhost:3000/**` |
| Preview (optional) | Matching Vercel preview origins + `/auth/callback` and `/auth/confirm` paths |

App behavior:

- Canonical origin comes from `getCanonicalAppUrl()` / `buildAuthCallbackUrl()` (`src/lib/config/app-url.ts`)
- Signup / resend use `emailRedirectTo` → `/auth/callback?next=/dashboard` (legacy ConfirmationURL / hash bridge)
- Password reset uses `redirectTo` → `/auth/callback?next=/reset-password`
- New Auth emails use TokenHash → `/auth/confirm`
- `/auth/confirm` exchanges `code` or `token_hash`+`type`, never logs tokens, and **does not** grant membership
- `/auth/callback` client page finishes implicit hash sessions, or forwards `code`/`token_hash` to `/auth/confirm`
- Success → `/verified` (then certificate-name gate or dashboard). Recovery → `/reset-password`
- Failure → `/verification-failed` with friendly copy + resend

## Verification checklist

- [ ] Resend domain verified
- [ ] Custom SMTP enabled with Resend
- [ ] Auth templates updated from repo files (TokenHash → `/auth/confirm`)
- [ ] Site URL = production app origin (not localhost)
- [ ] Redirect allowlist includes `/auth/callback` and `/auth/confirm`
- [ ] `NEXT_PUBLIC_APP_URL` production value is HTTPS, no trailing slash
- [ ] Confirm / reset / invite land on success or clear error UI
- [ ] No membership access granted from Auth callback alone
- [ ] Confirm Email remains enabled (`mailer_autoconfirm=false`)
