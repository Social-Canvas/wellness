-- Prepare quota-aware virtual live-session reservations + inactive in-person
-- redemption tracking. Does NOT change plan_capabilities or revoke Core /
-- nonprofit live_online_sessions access.
--
-- Gold (app-layer): limit 2 / calendar month, enforced via RPC when called.
-- Core / nonprofit: do not call quota RPC until client confirms rules.
-- Platinum in-person quantity: table prepared, enforcement inactive.

-- ---------------------------------------------------------------------------
-- Member virtual-session reservations (quota usage source of truth)
-- ---------------------------------------------------------------------------

create table if not exists public.live_session_member_reservations (
  id uuid primary key default gen_random_uuid(),
  live_class_id uuid not null references public.live_classes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.live_registration_status not null default 'confirmed',
  reserved_at timestamptz not null default now(),
  cancelled_at timestamptz,
  attended_at timestamptz,
  period_start timestamptz not null,
  period_end timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint live_session_member_reservations_period_check
    check (period_end > period_start),
  constraint live_session_member_reservations_status_check
    check (status in ('confirmed', 'attended', 'cancelled', 'expired')),
  unique (live_class_id, user_id)
);

create index if not exists live_session_member_reservations_user_period_idx
  on public.live_session_member_reservations (user_id, period_start, period_end);

create index if not exists live_session_member_reservations_user_status_idx
  on public.live_session_member_reservations (user_id, status);

create trigger live_session_member_reservations_set_updated_at
before update on public.live_session_member_reservations
for each row execute function public.set_updated_at();

alter table public.live_session_member_reservations enable row level security;

drop policy if exists live_session_member_reservations_select_own
  on public.live_session_member_reservations;
create policy live_session_member_reservations_select_own
  on public.live_session_member_reservations for select
  to authenticated
  using (user_id = auth.uid());

grant select on table public.live_session_member_reservations to authenticated, service_role;
grant select, insert, update, delete on table public.live_session_member_reservations to service_role;

comment on table public.live_session_member_reservations is
  'Membership virtual live-session reservations for quota plans (Gold). Trial registrations stay on live_session_registrations and never consume this quota.';

-- ---------------------------------------------------------------------------
-- Concurrency-safe reserve RPC (service_role / admin client only)
-- ---------------------------------------------------------------------------

create or replace function public.reserve_virtual_live_session(
  p_user_id uuid,
  p_live_class_id uuid,
  p_limit integer,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.live_classes%rowtype;
  v_existing public.live_session_member_reservations%rowtype;
  v_used integer;
  v_reservation public.live_session_member_reservations%rowtype;
begin
  if p_limit is null or p_limit < 1 then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_limit',
      'message', 'A positive virtual-session limit is required.'
    );
  end if;

  if p_period_end <= p_period_start then
    return jsonb_build_object(
      'ok', false,
      'code', 'invalid_period',
      'message', 'Invalid entitlement period.'
    );
  end if;

  -- Serialize per-user quota mutations for the period.
  perform pg_advisory_xact_lock(
    hashtext(p_user_id::text || ':' || p_period_start::text)
  );

  select * into v_session
  from public.live_classes
  where id = p_live_class_id;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_found',
      'message', 'Live session not found.'
    );
  end if;

  if v_session.status <> 'published' then
    return jsonb_build_object(
      'ok', false,
      'code', 'unavailable',
      'message', 'This session is not available.'
    );
  end if;

  if v_session.completed_at is not null then
    return jsonb_build_object(
      'ok', false,
      'code', 'unavailable',
      'message', 'This session has already ended.'
    );
  end if;

  select * into v_existing
  from public.live_session_member_reservations
  where live_class_id = p_live_class_id
    and user_id = p_user_id
  for update;

  if found and v_existing.status in ('confirmed', 'attended') then
    return jsonb_build_object(
      'ok', true,
      'code', 'already_reserved',
      'reservation_id', v_existing.id,
      'status', v_existing.status,
      'message', 'You already reserved this live session.'
    );
  end if;

  select count(*)::integer into v_used
  from public.live_session_member_reservations r
  join public.live_classes lc on lc.id = r.live_class_id
  where r.user_id = p_user_id
    and r.status in ('confirmed', 'attended')
    and lc.status = 'published'
    and lc.starts_at is not null
    and lc.starts_at >= p_period_start
    and lc.starts_at < p_period_end;

  if v_used >= p_limit then
    return jsonb_build_object(
      'ok', false,
      'code', 'quota_exceeded',
      'used', v_used,
      'limit', p_limit,
      'message',
        'You have used both included live virtual sessions for this month. Upgrade to Platinum for access to all live virtual classes.'
    );
  end if;

  if found and v_existing.status in ('cancelled', 'expired') then
    update public.live_session_member_reservations
    set
      status = 'confirmed',
      reserved_at = now(),
      cancelled_at = null,
      attended_at = null,
      period_start = p_period_start,
      period_end = p_period_end,
      updated_at = now()
    where id = v_existing.id
    returning * into v_reservation;
  else
    insert into public.live_session_member_reservations (
      live_class_id,
      user_id,
      status,
      period_start,
      period_end
    )
    values (
      p_live_class_id,
      p_user_id,
      'confirmed',
      p_period_start,
      p_period_end
    )
    returning * into v_reservation;
  end if;

  return jsonb_build_object(
    'ok', true,
    'code', 'reserved',
    'reservation_id', v_reservation.id,
    'status', v_reservation.status,
    'used', v_used + 1,
    'limit', p_limit,
    'remaining', greatest(p_limit - (v_used + 1), 0)
  );
end;
$$;

revoke all on function public.reserve_virtual_live_session(uuid, uuid, integer, timestamptz, timestamptz)
  from public, anon, authenticated;
grant execute on function public.reserve_virtual_live_session(uuid, uuid, integer, timestamptz, timestamptz)
  to service_role;

-- ---------------------------------------------------------------------------
-- Cancel reservation (releases allowance)
-- ---------------------------------------------------------------------------

create or replace function public.cancel_virtual_live_session_reservation(
  p_user_id uuid,
  p_live_class_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.live_session_member_reservations%rowtype;
begin
  perform pg_advisory_xact_lock(hashtext(p_user_id::text || ':virtual_quota'));

  select * into v_row
  from public.live_session_member_reservations
  where live_class_id = p_live_class_id
    and user_id = p_user_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'not_found',
      'message', 'Reservation not found.'
    );
  end if;

  if v_row.status = 'cancelled' then
    return jsonb_build_object(
      'ok', true,
      'code', 'already_cancelled',
      'reservation_id', v_row.id
    );
  end if;

  if v_row.status = 'attended' then
    return jsonb_build_object(
      'ok', false,
      'code', 'already_attended',
      'message', 'Attended sessions cannot be cancelled.'
    );
  end if;

  update public.live_session_member_reservations
  set
    status = 'cancelled',
    cancelled_at = now(),
    updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'code', 'cancelled',
    'reservation_id', v_row.id
  );
end;
$$;

revoke all on function public.cancel_virtual_live_session_reservation(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.cancel_virtual_live_session_reservation(uuid, uuid)
  to service_role;

-- Mark reservation attended on join (does not create a second usage row).
create or replace function public.mark_virtual_live_session_attended(
  p_user_id uuid,
  p_live_class_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.live_session_member_reservations%rowtype;
begin
  select * into v_row
  from public.live_session_member_reservations
  where live_class_id = p_live_class_id
    and user_id = p_user_id
  for update;

  if not found or v_row.status not in ('confirmed', 'attended') then
    return jsonb_build_object(
      'ok', false,
      'code', 'reservation_required',
      'message', 'Reserve this live session before joining.'
    );
  end if;

  if v_row.status = 'attended' then
    return jsonb_build_object(
      'ok', true,
      'code', 'already_attended',
      'reservation_id', v_row.id
    );
  end if;

  update public.live_session_member_reservations
  set
    status = 'attended',
    attended_at = now(),
    updated_at = now()
  where id = v_row.id
  returning * into v_row;

  return jsonb_build_object(
    'ok', true,
    'code', 'attended',
    'reservation_id', v_row.id
  );
end;
$$;

revoke all on function public.mark_virtual_live_session_attended(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.mark_virtual_live_session_attended(uuid, uuid)
  to service_role;

-- ---------------------------------------------------------------------------
-- In-person experience redemptions (INACTIVE quantity enforcement)
-- ---------------------------------------------------------------------------

create table if not exists public.in_person_experience_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_slug text not null,
  experience_label text not null default 'live in-person experience',
  status text not null default 'pending_admin_confirmation'
    check (status in (
      'pending_admin_confirmation',
      'confirmed',
      'cancelled',
      'redeemed'
    )),
  reset_period text
    check (reset_period is null or reset_period in ('monthly', 'annually', 'never')),
  period_start timestamptz,
  period_end timestamptz,
  admin_confirmed_at timestamptz,
  admin_confirmed_by uuid references public.profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists in_person_experience_redemptions_user_idx
  on public.in_person_experience_redemptions (user_id, status);

create trigger in_person_experience_redemptions_set_updated_at
before update on public.in_person_experience_redemptions
for each row execute function public.set_updated_at();

alter table public.in_person_experience_redemptions enable row level security;

drop policy if exists in_person_experience_redemptions_select_own
  on public.in_person_experience_redemptions;
create policy in_person_experience_redemptions_select_own
  on public.in_person_experience_redemptions for select
  to authenticated
  using (user_id = auth.uid());

grant select on table public.in_person_experience_redemptions to authenticated, service_role;
grant select, insert, update, delete on table public.in_person_experience_redemptions to service_role;

comment on table public.in_person_experience_redemptions is
  'Prepared Platinum in-person experience tracking. Quantity/reset enforcement stays inactive until the client confirms monthly/annual/never. reset_period may be null.';

comment on column public.in_person_experience_redemptions.reset_period is
  'UNCONFIRMED — leave null until client decides monthly, annually, or never. Do not invent.';
