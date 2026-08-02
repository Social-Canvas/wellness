-- Unified membership lifecycle: capabilities, nonprofit orgs/seats, lifecycle events.
-- Unifies course-library content_access across Core/Gold/Platinum.
-- Does not create Stripe resources or mutate Mux.

-- ---------------------------------------------------------------------------
-- Capabilities
-- ---------------------------------------------------------------------------

create table if not exists public.capabilities (
  key text primary key,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.plan_capabilities (
  plan_id uuid not null references public.plans (id) on delete cascade,
  capability_key text not null references public.capabilities (key) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (plan_id, capability_key)
);

create index if not exists plan_capabilities_capability_key_idx
  on public.plan_capabilities (capability_key);

insert into public.capabilities (key, name, description) values
  ('membership_course_library', 'Membership course library', 'Access to the shared membership course library'),
  ('live_online_sessions', 'Live online sessions', 'Access to virtual live sessions'),
  ('in_person_sessions', 'In-person sessions', 'Eligibility to attend in-person sessions'),
  ('integration_journal', 'Integration journal', 'Access to the Elevate Integration Journal'),
  ('session_replays', 'Session replays', 'Access to recorded session replays'),
  ('leadership_sessions', 'Leadership sessions', 'Access to leadership reset sessions'),
  ('priority_support', 'Priority support', 'Priority member support')
on conflict (key) do nothing;

-- All active individual plans share the course library + live online + replays.
-- Core: no in-person. Gold: in-person. Platinum: in-person + configurable extras (priority_support only until confirmed).
insert into public.plan_capabilities (plan_id, capability_key)
select p.id, c.key
from public.plans p
cross join (values
  ('membership_course_library'),
  ('live_online_sessions'),
  ('session_replays')
) as c(key)
where p.slug in ('plan-1', 'plan-2', 'plan-3')
on conflict do nothing;

insert into public.plan_capabilities (plan_id, capability_key)
select p.id, 'in_person_sessions'
from public.plans p
where p.slug in ('plan-2', 'plan-3')
on conflict do nothing;

insert into public.plan_capabilities (plan_id, capability_key)
select p.id, 'priority_support'
from public.plans p
where p.slug = 'plan-3'
on conflict do nothing;

-- Unify course library entitlement across all membership plans (same courses).
insert into public.content_access (plan_id, content_type, content_id)
select p.id, 'course', c.id
from public.plans p
cross join public.courses c
where p.slug in ('plan-1', 'plan-2', 'plan-3')
  and c.slug in (
    '7-day-reset-meditation-series',
    'core-course-library',
    'virtual-live-session-library',
    'in-person-monthly-extras'
  )
on conflict (plan_id, content_type, content_id) do nothing;

-- Display names + working monthly amounts (placeholder Stripe IDs unchanged).
update public.plans
set
  name = case slug
    when 'plan-1' then 'Elevate Core'
    when 'plan-2' then 'Elevate Gold'
    when 'plan-3' then 'Elevate Platinum'
    else name
  end,
  description = case slug
    when 'plan-1' then 'Starter recurring membership with the full Elevate course library. In-person sessions are not included.'
    when 'plan-2' then 'Mid-tier membership with the full course library and in-person session eligibility.'
    when 'plan-3' then 'Premium membership with the full course library and the highest-touch Elevate experience.'
    else description
  end,
  updated_at = now()
where slug in ('plan-1', 'plan-2', 'plan-3');

update public.plan_prices pp
set
  amount = case
    when p.slug = 'plan-1' and pp.billing_interval = 'monthly' then 4700
    when p.slug = 'plan-1' and pp.billing_interval = 'yearly' then 4700 * 12
    when p.slug = 'plan-2' and pp.billing_interval = 'monthly' then 9900
    when p.slug = 'plan-2' and pp.billing_interval = 'yearly' then 9900 * 12
    when p.slug = 'plan-3' and pp.billing_interval = 'monthly' then 14900
    when p.slug = 'plan-3' and pp.billing_interval = 'yearly' then 14900 * 12
    else pp.amount
  end,
  updated_at = now()
from public.plans p
where pp.plan_id = p.id
  and p.slug in ('plan-1', 'plan-2', 'plan-3')
  and pp.stripe_price_id like 'price_placeholder_%';

-- ---------------------------------------------------------------------------
-- Nonprofit organizations & seats
-- ---------------------------------------------------------------------------

create type public.organization_type as enum ('nonprofit');

create type public.organization_member_role as enum (
  'owner',
  'administrator',
  'member'
);

create type public.organization_member_status as enum (
  'invited',
  'active',
  'suspended',
  'removed'
);

create type public.organization_access_model as enum (
  'employee_volunteer',
  'member_community',
  'sponsored',
  'discounted',
  'hybrid'
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_type public.organization_type not null default 'nonprofit',
  access_model public.organization_access_model not null default 'employee_volunteer',
  plan_id uuid references public.plans (id) on delete set null,
  seat_limit integer not null default 0 check (seat_limit >= 0),
  status text not null default 'active' check (status in ('draft', 'active', 'suspended', 'cancelled')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  scheduled_plan_id uuid references public.plans (id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_status_idx on public.organizations (status);
create index if not exists organizations_plan_id_idx on public.organizations (plan_id);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  email text not null,
  role public.organization_member_role not null default 'member',
  status public.organization_member_status not null default 'invited',
  assigned_plan_id uuid references public.plans (id) on delete set null,
  invited_at timestamptz not null default now(),
  activated_at timestamptz,
  suspended_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, email)
);

create index if not exists organization_members_org_id_idx
  on public.organization_members (organization_id);
create index if not exists organization_members_user_id_idx
  on public.organization_members (user_id);
create index if not exists organization_members_status_idx
  on public.organization_members (status);

create trigger organization_members_set_updated_at
before update on public.organization_members
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Personal subscription schedule fields (downgrade / cancel at period end)
-- ---------------------------------------------------------------------------

alter table public.subscriptions
  add column if not exists scheduled_plan_id uuid references public.plans (id) on delete set null,
  add column if not exists access_source text not null default 'personal_stripe'
    check (access_source in ('personal_stripe', 'complimentary'));

-- ---------------------------------------------------------------------------
-- Lifecycle event outbox (email automation consumers; no external send here)
-- ---------------------------------------------------------------------------

create type public.membership_lifecycle_event_type as enum (
  'membership_started',
  'membership_upgraded',
  'membership_downgrade_scheduled',
  'membership_downgrade_effective',
  'membership_cancellation_scheduled',
  'membership_cancelled',
  'membership_payment_failed',
  'membership_payment_recovered',
  'organization_member_invited',
  'organization_member_activated',
  'organization_member_suspended',
  'organization_member_removed',
  'capability_granted',
  'capability_revoked'
);

create type public.lifecycle_event_status as enum (
  'pending',
  'processed',
  'failed',
  'skipped'
);

create table if not exists public.membership_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  event_type public.membership_lifecycle_event_type not null,
  user_id uuid references public.profiles (id) on delete set null,
  organization_id uuid references public.organizations (id) on delete set null,
  plan_id uuid references public.plans (id) on delete set null,
  source_event_id text not null,
  effective_at timestamptz not null default now(),
  status public.lifecycle_event_status not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (source_event_id, event_type)
);

create index if not exists membership_lifecycle_events_user_id_idx
  on public.membership_lifecycle_events (user_id);
create index if not exists membership_lifecycle_events_status_idx
  on public.membership_lifecycle_events (status);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.capabilities enable row level security;
alter table public.plan_capabilities enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.membership_lifecycle_events enable row level security;

-- Capabilities are readable by authenticated users (not secret).
drop policy if exists capabilities_select_authenticated on public.capabilities;
create policy capabilities_select_authenticated
  on public.capabilities for select
  to authenticated
  using (true);

drop policy if exists plan_capabilities_select_authenticated on public.plan_capabilities;
create policy plan_capabilities_select_authenticated
  on public.plan_capabilities for select
  to authenticated
  using (true);

-- Users can read organizations they belong to (active/invited/suspended).
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member
  on public.organizations for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      join public.profiles pr on pr.id = om.user_id
      where om.organization_id = organizations.id
        and pr.auth_user_id = auth.uid()
        and om.status in ('invited', 'active', 'suspended')
    )
  );

-- Members can read their org roster; only admins/owners managed via service role for mutations.
drop policy if exists organization_members_select_same_org on public.organization_members;
create policy organization_members_select_same_org
  on public.organization_members for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members self_om
      join public.profiles pr on pr.id = self_om.user_id
      where self_om.organization_id = organization_members.organization_id
        and pr.auth_user_id = auth.uid()
        and self_om.status in ('invited', 'active', 'suspended')
    )
  );

-- Users can read their own lifecycle events.
drop policy if exists membership_lifecycle_events_select_own on public.membership_lifecycle_events;
create policy membership_lifecycle_events_select_own
  on public.membership_lifecycle_events for select
  to authenticated
  using (
    user_id in (
      select id from public.profiles where auth_user_id = auth.uid()
    )
  );

-- No insert/update/delete for authenticated on provider-owned tables (service_role bypasses RLS).
grant select on table public.capabilities to authenticated, service_role;
grant select on table public.plan_capabilities to authenticated, service_role;
grant select on table public.organizations to authenticated, service_role;
grant select on table public.organization_members to authenticated, service_role;
grant select on table public.membership_lifecycle_events to authenticated, service_role;

grant select, insert, update, delete on table public.capabilities to service_role;
grant select, insert, update, delete on table public.plan_capabilities to service_role;
grant select, insert, update, delete on table public.organizations to service_role;
grant select, insert, update, delete on table public.organization_members to service_role;
grant select, insert, update, delete on table public.membership_lifecycle_events to service_role;
