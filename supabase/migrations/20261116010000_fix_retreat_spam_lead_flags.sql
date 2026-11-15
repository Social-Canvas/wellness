-- Re-apply the reviewed September 2026 retreat-spam flag.
-- 20261115121000 matched the rows, then leads_protect_bot_columns restored the
-- old bot values because the migration runner is not auth.role() = service_role.
-- The permanent trigger stays in place. It is disabled only inside this
-- transaction, and PostgreSQL restores it if the transaction rolls back.

begin;

lock table public.leads in share row exclusive mode;

alter table public.leads disable trigger leads_protect_bot_columns;

update public.leads
set
  suspected_bot = true,
  bot_reason = 'retreat_spam_fingerprint',
  bot_flagged_at = coalesce(bot_flagged_at, now())
where suspected_bot = false
  and lead_type = 'retreat'
  and source = 'retreats_page'
  and created_at >= timestamptz '2026-09-09 00:00:00+00'
  and created_at < timestamptz '2026-09-14 00:00:00+00';

alter table public.leads enable trigger leads_protect_bot_columns;

commit;
