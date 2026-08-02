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
3. Send a test Auth email only to an allowlisted operator inbox.

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

## Site URL and redirect allowlist

Set in Supabase → Authentication → URL Configuration:

| Setting | Production value |
|---|---|
| Site URL | Exact production origin of `NEXT_PUBLIC_APP_URL` (no trailing slash) |
| Redirect URLs | `${NEXT_PUBLIC_APP_URL}/auth/callback` |
| | `${NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard` |
| | `${NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password` |
| | `${NEXT_PUBLIC_APP_URL}/reset-password` (legacy fallback) |
| Preview (optional) | Matching Vercel preview origins + `/auth/callback` paths |

App behavior:

- Signup confirmation uses `emailRedirectTo` → `/auth/callback?next=/dashboard`
- Password reset uses `redirectTo` → `/auth/callback?next=/reset-password`
- `/auth/callback` exchanges the code server-side, never logs tokens, and **does not** grant membership

## Verification checklist

- [ ] Resend domain verified
- [ ] Custom SMTP enabled with Resend
- [ ] Auth templates updated from repo files
- [ ] Site URL = production app origin
- [ ] Redirect allowlist includes `/auth/callback` variants
- [ ] Confirm / reset / invite land on success or clear error UI
- [ ] No membership access granted from Auth callback alone
