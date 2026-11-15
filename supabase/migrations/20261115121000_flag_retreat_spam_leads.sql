-- Flag the September 2026 /retreats spam campaign. Does not delete rows.
-- Read-only audit on 2026-11-15: 44/44 leads were this campaign (lead_type retreat,
-- source retreats_page, 9-13 Sep 2026) and matched the generated-token fingerprint.
-- No other lead rows existed. Accounts are not updated here.

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
