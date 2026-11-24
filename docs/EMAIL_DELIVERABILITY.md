# Email deliverability

Checked 15 Nov 2026. Re-checked public DNS on 24 Nov 2026. No DNS records were changed. No sender address was changed. The public records below are unchanged.

The local production-backed environment sends transactional mail as:

- From: `no-reply@elevate-healthsolutions.com`
- Reply-To: `sender@elevate-healthsolutions.com`

`hello@elevate-healthsolutions.com` was not confirmed as a mailbox. Do not switch From or Reply-To until Microsoft 365 shows that mailbox or alias, and Resend shows the domain verified.

## What DNS shows

| Check | Result |
|---|---|
| Nameservers | GoDaddy `ns27.domaincontrol.com`, `ns28.domaincontrol.com` |
| MX | `elevatehealthsolutions-com01i.mail.protection.outlook.com` (Microsoft 365) |
| Apex SPF | One record: `v=spf1 include:secureserver.net -all` |
| DMARC | One record: `v=DMARC1; p=none;` |
| Resend DKIM | `resend._domainkey` TXT is present. Do not replace it unless Resend shows a mismatch. |
| Resend return-path | No `send` TXT, MX, or CNAME was found |
| Kit DKIM | No Kit selectors were found |
| HTTPS | `https://elevate-healthsolutions.com` is the Next.js app on Vercel. `www` redirects there. |

The Resend API key in the local env can send mail and cannot read domain status, so the Resend dashboard is still required to see Verified vs Failed.

Root SPF authorizes GoDaddy (`secureserver.net`) and then fails everyone else (`-all`). It does not authorize Microsoft 365 or Resend. Microsoft receives the domain's mail, so mailbox-sent messages can fail SPF. Resend can still DKIM-sign, but the missing `send` return-path means SPF alignment is incomplete. DMARC is `p=none`, so mail is not rejected for alignment, but Outlook can still file it as junk.

## Manual DNS actions

Do these in GoDaddy. Do not add a second SPF TXT. Do not add a second `_dmarc` TXT. Do not overwrite `resend._domainkey` if it already matches Resend.

1. In Microsoft 365, confirm whether `hello@`, `no-reply@`, and `sender@` are mailboxes or aliases.
2. In Resend, open the domain Records tab and copy every record exactly.
   - Older domains: MX and TXT on the host `send`. The TXT is `v=spf1 include:amazonses.com ~all`. The MX target includes the region, for example `feedback-smtp.us-east-1.amazonses.com`.
   - Domains created after August 2026 may show CNAMEs instead. Use those, not the MX pair.
3. Leave the existing apex SPF as a single record. If the Microsoft mailboxes should pass SPF, edit that one record to:

   `v=spf1 include:secureserver.net include:spf.protection.outlook.com -all`

   Remove `include:secureserver.net` only after confirming GoDaddy no longer sends mail for this domain.
4. Do not put `include:amazonses.com` on the apex. That belongs on `send`, or inside the Resend CNAMEs.
5. After Resend shows the domain verified, send a test to an Outlook inbox. If it lands in Inbox, then decide whether From should become `hello@`. Until then keep `no-reply@`.
6. Point Supabase Auth custom SMTP at the same verified Resend domain. Unconfirmed signups (364 of 446 on 15 Nov 2026) are consistent with confirmation mail missing the inbox.
7. Add Kit DNS only when marketing turns Kit sending on. Kit is not the transactional sender.

## Application ownership

Resend sends transactional mail only. Kit sends marketing mail only. Signup, purchase, enquiry, and free claim do not subscribe someone to Kit unless they give marketing consent.
