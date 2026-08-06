-- Annual membership billing: approved yearly amounts + scheduled cadence column.
-- Does not modify monthly Stripe Price IDs or create plan IDs.

-- Approved annual amounts (cents): Core $500, Gold $1,000, Platinum $1,500
update public.plan_prices pp
set
  amount = case
    when p.slug = 'plan-1' and pp.billing_interval = 'yearly' then 50000
    when p.slug = 'plan-2' and pp.billing_interval = 'yearly' then 100000
    when p.slug = 'plan-3' and pp.billing_interval = 'yearly' then 150000
    else pp.amount
  end,
  updated_at = now()
from public.plans p
where pp.plan_id = p.id
  and p.slug in ('plan-1', 'plan-2', 'plan-3')
  and pp.billing_interval = 'yearly';

-- Scheduled billing-interval change (period-end cadence / combined changes).
-- Current plan/cadence remain authoritative until Stripe webhook confirms.
alter table public.subscriptions
  add column if not exists scheduled_billing_interval public.billing_interval;

comment on column public.subscriptions.scheduled_billing_interval is
  'Target billing interval scheduled for period end; null when no cadence change is pending.';
