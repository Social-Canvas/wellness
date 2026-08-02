-- Extend membership_lifecycle_events with transactional email delivery state.
-- Choice: columns on the existing outbox table (not a separate delivery table)
-- because lifecycle events are already the idempotent email enqueue surface
-- (unique source_event_id + event_type) and delivery is 1:1 with each event.

-- ---------------------------------------------------------------------------
-- Enum for email delivery status
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'lifecycle_email_status' and n.nspname = 'public'
  ) then
    create type public.lifecycle_email_status as enum (
      'pending',
      'processing',
      'sent',
      'retry',
      'failed',
      'skipped'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Delivery columns (idempotent adds)
-- ---------------------------------------------------------------------------

alter table public.membership_lifecycle_events
  add column if not exists email_status public.lifecycle_email_status not null default 'pending';

alter table public.membership_lifecycle_events
  add column if not exists email_attempt_count integer not null default 0;

alter table public.membership_lifecycle_events
  add column if not exists email_next_attempt_at timestamptz;

alter table public.membership_lifecycle_events
  add column if not exists email_locked_at timestamptz;

alter table public.membership_lifecycle_events
  add column if not exists email_sent_at timestamptz;

alter table public.membership_lifecycle_events
  add column if not exists email_provider_message_id text;

alter table public.membership_lifecycle_events
  add column if not exists email_last_error text;

alter table public.membership_lifecycle_events
  add column if not exists email_template text;

alter table public.membership_lifecycle_events
  add column if not exists email_recipient_user_id uuid references public.profiles (id) on delete set null;

-- Backfill: events that are not email-mapped stay pending until the processor
-- marks them skipped. Do not change historical status semantics.

comment on column public.membership_lifecycle_events.email_status is
  'Transactional email delivery state. Independent of lifecycle status.';
comment on column public.membership_lifecycle_events.email_recipient_user_id is
  'Preferred recipient profile id. Resolve verified email at send time.';
comment on column public.membership_lifecycle_events.email_last_error is
  'Redacted provider/validation error only. Never store HTML, API bodies, or secrets.';

-- ---------------------------------------------------------------------------
-- Indexes for claim/retry workers
-- ---------------------------------------------------------------------------

create index if not exists membership_lifecycle_events_email_pending_idx
  on public.membership_lifecycle_events (email_next_attempt_at nulls first, created_at)
  where email_status in ('pending', 'retry');

create index if not exists membership_lifecycle_events_email_status_idx
  on public.membership_lifecycle_events (email_status);

-- ---------------------------------------------------------------------------
-- Atomic claim helper (service_role only)
-- ---------------------------------------------------------------------------

create or replace function public.claim_lifecycle_email_batch(p_limit integer default 10)
returns setof public.membership_lifecycle_events
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 10), 50));
begin
  return query
  with candidates as (
    select e.id
    from public.membership_lifecycle_events e
    where e.email_status in ('pending', 'retry')
      and (e.email_next_attempt_at is null or e.email_next_attempt_at <= now())
      and (
        e.email_locked_at is null
        or e.email_locked_at < now() - interval '5 minutes'
      )
    order by e.email_next_attempt_at nulls first, e.created_at asc
    for update skip locked
    limit v_limit
  ),
  claimed as (
    update public.membership_lifecycle_events e
    set
      email_status = 'processing'::public.lifecycle_email_status,
      email_locked_at = now(),
      email_attempt_count = e.email_attempt_count + 1
    from candidates c
    where e.id = c.id
    returning e.*
  )
  select * from claimed;
end;
$$;

revoke all on function public.claim_lifecycle_email_batch(integer) from public;
revoke all on function public.claim_lifecycle_email_batch(integer) from anon, authenticated;
grant execute on function public.claim_lifecycle_email_batch(integer) to service_role;

-- Authenticated users remain SELECT-only on lifecycle events (existing policy).
-- Delivery field mutations are service_role only (no new write policies for authenticated).
