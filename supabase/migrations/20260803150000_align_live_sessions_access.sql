-- Align Elevate live sessions, trial registrations, nonprofit billing tiers,
-- and shared recording linkage. Capabilities stay shared (no content duplication).
-- Recording access continues to use deployed capability key: session_replays.

-- ---------------------------------------------------------------------------
-- Nonprofit org billing tier (seats/billing only — not a content tier)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'organization_billing_tier'
      and n.nspname = 'public'
  ) then
    create type public.organization_billing_tier as enum (
      'small',
      'mid_size',
      'large',
      'enterprise'
    );
  end if;
end $$;

alter table public.organizations
  add column if not exists billing_tier public.organization_billing_tier;

comment on column public.organizations.billing_tier is
  'Commercial seat/billing band (Small/Mid/Large/Enterprise). Content access comes from plan_id (Core-equivalent), never from billing_tier.';

comment on column public.organizations.plan_id is
  'Effective content plan for sponsored members. Nonprofit-sponsored access is Core-equivalent (live + recordings); do not map seat tiers to Gold/Platinum.';

-- ---------------------------------------------------------------------------
-- Live class session model enhancements
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'live_session_kind'
      and n.nspname = 'public'
  ) then
    create type public.live_session_kind as enum (
      'membership_weekly',
      'public_trial'
    );
  end if;
end $$;

alter table public.live_classes
  alter column calendly_url drop not null;

alter table public.live_classes
  add column if not exists ends_at timestamptz,
  add column if not exists capacity integer,
  add column if not exists session_kind public.live_session_kind not null default 'membership_weekly',
  add column if not exists allows_public_trial boolean not null default false,
  add column if not exists trial_open boolean not null default false,
  add column if not exists completed_at timestamptz;

alter table public.live_classes
  drop constraint if exists live_classes_capacity_check;
alter table public.live_classes
  add constraint live_classes_capacity_check
  check (capacity is null or capacity > 0);

-- Drop legacy public Zoom exposure: participant/host URLs move to secrets table.
-- Keep zoom_join_url column temporarily unused by app code (nullable).
comment on column public.live_classes.zoom_join_url is
  'DEPRECATED — do not use. Participant URLs live in live_class_secrets and are released only after entitlement checks.';

-- Public/authenticated may read schedule metadata only; never Zoom secrets.
drop policy if exists live_classes_select_published on public.live_classes;
create policy live_classes_select_published
  on public.live_classes for select
  to anon, authenticated
  using (status = 'published');

-- ---------------------------------------------------------------------------
-- Zoom secrets — service_role only (never in public HTML / anon SELECT)
-- ---------------------------------------------------------------------------

create table if not exists public.live_class_secrets (
  live_class_id uuid primary key references public.live_classes (id) on delete cascade,
  zoom_participant_url text,
  zoom_host_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_class_secrets_participant_url_check
    check (zoom_participant_url is null or length(trim(zoom_participant_url)) > 0),
  constraint live_class_secrets_host_url_check
    check (zoom_host_url is null or length(trim(zoom_host_url)) > 0)
);

create trigger live_class_secrets_set_updated_at
before update on public.live_class_secrets
for each row execute function public.set_updated_at();

alter table public.live_class_secrets enable row level security;

-- No policies for anon/authenticated — service_role bypasses RLS.
grant select, insert, update, delete on table public.live_class_secrets to service_role;

-- ---------------------------------------------------------------------------
-- Trial / member live-session registrations
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'live_registration_type'
      and n.nspname = 'public'
  ) then
    create type public.live_registration_type as enum (
      'member',
      'public_trial'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'live_registration_status'
      and n.nspname = 'public'
  ) then
    create type public.live_registration_status as enum (
      'pending_payment',
      'confirmed',
      'cancelled',
      'attended',
      'expired'
    );
  end if;
end $$;

create table if not exists public.live_session_registrations (
  id uuid primary key default gen_random_uuid(),
  live_class_id uuid not null references public.live_classes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  registration_type public.live_registration_type not null,
  status public.live_registration_status not null default 'pending_payment',
  order_id uuid references public.orders (id) on delete set null,
  product_id uuid references public.products (id) on delete set null,
  stripe_checkout_session_id text unique,
  confirmed_at timestamptz,
  attended_at timestamptz,
  feedback_submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (live_class_id, user_id, registration_type)
);

create index if not exists live_session_registrations_user_id_idx
  on public.live_session_registrations (user_id);
create index if not exists live_session_registrations_live_class_id_idx
  on public.live_session_registrations (live_class_id);
create index if not exists live_session_registrations_status_idx
  on public.live_session_registrations (status);

create trigger live_session_registrations_set_updated_at
before update on public.live_session_registrations
for each row execute function public.set_updated_at();

alter table public.live_session_registrations enable row level security;

drop policy if exists live_session_registrations_select_own on public.live_session_registrations;
create policy live_session_registrations_select_own
  on public.live_session_registrations for select
  to authenticated
  using (user_id = auth.uid());

-- Mutations via service_role only.
grant select on table public.live_session_registrations to authenticated, service_role;
grant select, insert, update, delete on table public.live_session_registrations to service_role;

-- ---------------------------------------------------------------------------
-- Post-session feedback (trial conversion + member optional)
-- ---------------------------------------------------------------------------

create table if not exists public.live_session_feedback (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.live_session_registrations (id) on delete cascade,
  live_class_id uuid not null references public.live_classes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating integer check (rating is null or (rating >= 1 and rating <= 5)),
  comment text,
  interested_in_membership boolean,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists live_session_feedback_live_class_id_idx
  on public.live_session_feedback (live_class_id);

create trigger live_session_feedback_set_updated_at
before update on public.live_session_feedback
for each row execute function public.set_updated_at();

alter table public.live_session_feedback enable row level security;

drop policy if exists live_session_feedback_select_own on public.live_session_feedback;
create policy live_session_feedback_select_own
  on public.live_session_feedback for select
  to authenticated
  using (user_id = auth.uid());

grant select on table public.live_session_feedback to authenticated, service_role;
grant select, insert, update, delete on table public.live_session_feedback to service_role;

-- ---------------------------------------------------------------------------
-- Shared recording archive ↔ live session link (one recording, all members)
-- ---------------------------------------------------------------------------

alter table public.recorded_sessions
  add column if not exists live_class_id uuid references public.live_classes (id) on delete set null;

create index if not exists recorded_sessions_live_class_id_idx
  on public.recorded_sessions (live_class_id)
  where live_class_id is not null;

-- ---------------------------------------------------------------------------
-- Lifecycle email event types for trial / live session flows
-- ---------------------------------------------------------------------------

alter type public.membership_lifecycle_event_type add value if not exists 'live_trial_registered';
alter type public.membership_lifecycle_event_type add value if not exists 'live_session_reminder';
alter type public.membership_lifecycle_event_type add value if not exists 'live_session_completed_feedback';
alter type public.membership_lifecycle_event_type add value if not exists 'live_trial_membership_cta';

-- ---------------------------------------------------------------------------
-- Clarify session_replays = recorded sessions library (deployed key; do not rename)
-- ---------------------------------------------------------------------------

update public.capabilities
set
  name = 'Recorded sessions',
  description = 'Shared Elevate membership recorded-sessions archive (business alias: recorded_sessions). Same library for Core, Gold, Platinum, and nonprofit-sponsored Core-equivalent access.'
where key = 'session_replays';

update public.capabilities
set
  description = 'Access to weekly live online Zoom sessions (shared schedule for all membership tiers with this capability).'
where key = 'live_online_sessions';
