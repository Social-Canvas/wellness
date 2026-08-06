-- Nonprofit sponsorship access codes + organization lifecycle alignment.
-- Platinum-equivalent sponsored access; hash-only codes; atomic redemption.

-- ---------------------------------------------------------------------------
-- Organization status + sponsorship fields
-- ---------------------------------------------------------------------------

alter table public.organizations
  drop constraint if exists organizations_status_check;

-- Preserve historical draft rows by mapping them before tightening the check.
update public.organizations
set status = 'pending'
where status = 'draft';

alter table public.organizations
  add constraint organizations_status_check
  check (
    status in (
      'pending',
      'approved',
      'active',
      'suspended',
      'expired',
      'cancelled'
    )
  );

alter table public.organizations
  add column if not exists billing_status text not null default 'unpaid'
    check (
      billing_status in (
        'unpaid',
        'invoiced',
        'paid',
        'manual_contract',
        'stripe_subscription',
        'past_due',
        'cancelled'
      )
    ),
  add column if not exists access_start_at timestamptz,
  add column if not exists access_end_at timestamptz,
  add column if not exists direct_activation boolean not null default true,
  add column if not exists approved_email_domains text[] not null default '{}'::text[],
  add column if not exists approved_emails text[] not null default '{}'::text[];

comment on column public.organizations.billing_status is
  'Organization contract/payment status — separate from participant Stripe billing.';
comment on column public.organizations.direct_activation is
  'When true, access-code redemption activates membership immediately; when false, creates pending invitation for org admin approval.';

-- Existing active orgs keep access: treat prior contracts as manually recorded.
update public.organizations
set billing_status = 'manual_contract'
where status = 'active'
  and billing_status = 'unpaid';

-- Map existing sponsored orgs to Platinum (plan-3) without removing members.
update public.organizations o
set plan_id = p.id
from public.plans p
where p.slug = 'plan-3'
  and (
    o.plan_id is null
    or exists (
      select 1
      from public.plans existing
      where existing.id = o.plan_id
        and existing.slug in ('plan-1', 'plan-2')
    )
  );

-- ---------------------------------------------------------------------------
-- Access codes (hash only — never store plaintext redeemable code)
-- ---------------------------------------------------------------------------

create type public.organization_access_code_status as enum (
  'active',
  'revoked',
  'expired',
  'rotated'
);

create table if not exists public.organization_access_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code_hash text not null,
  code_prefix text not null,
  status public.organization_access_code_status not null default 'active',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  last_rotated_at timestamptz,
  allowed_email_domain text,
  redemption_instructions text,
  unique (code_hash)
);

create index if not exists organization_access_codes_org_id_idx
  on public.organization_access_codes (organization_id);

create index if not exists organization_access_codes_status_idx
  on public.organization_access_codes (status);

create unique index if not exists organization_access_codes_one_active_per_org
  on public.organization_access_codes (organization_id)
  where status = 'active';

create trigger organization_access_codes_set_updated_at
before update on public.organization_access_codes
for each row execute function public.set_updated_at();

-- Failed / successful redemption attempts for rate limiting (no full codes).
create table if not exists public.organization_access_code_attempts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  success boolean not null default false,
  failure_reason text,
  code_prefix text,
  created_at timestamptz not null default now()
);

create index if not exists organization_access_code_attempts_profile_created_idx
  on public.organization_access_code_attempts (profile_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Lifecycle event types for sponsorship
-- ---------------------------------------------------------------------------

alter type public.membership_lifecycle_event_type add value if not exists 'organization_approved';
alter type public.membership_lifecycle_event_type add value if not exists 'organization_administrator_invited';
alter type public.membership_lifecycle_event_type add value if not exists 'organization_access_code_created';
alter type public.membership_lifecycle_event_type add value if not exists 'organization_sponsored_access_activated';
alter type public.membership_lifecycle_event_type add value if not exists 'organization_seat_limit_reached';
alter type public.membership_lifecycle_event_type add value if not exists 'organization_access_expiring';
alter type public.membership_lifecycle_event_type add value if not exists 'organization_access_expired';

-- ---------------------------------------------------------------------------
-- Occupied seats: active + suspended (reserved) + non-expired invitations
-- ---------------------------------------------------------------------------

create or replace function public.count_occupied_organization_seats(
  p_organization_id uuid
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.organization_members om
  where om.organization_id = p_organization_id
    and om.status in ('active', 'suspended', 'invited');
$$;

revoke all on function public.count_occupied_organization_seats(uuid) from public;
grant execute on function public.count_occupied_organization_seats(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Atomic redeem (concurrency-safe seat + membership mutation)
-- ---------------------------------------------------------------------------

create or replace function public.redeem_organization_access_code(
  p_code_hash text,
  p_profile_id uuid,
  p_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.organization_access_codes%rowtype;
  v_org public.organizations%rowtype;
  v_member public.organization_members%rowtype;
  v_occupied integer;
  v_email text := lower(trim(p_email));
  v_domain text;
  v_platinum_plan_id uuid;
  v_status public.organization_member_status;
  v_now timestamptz := now();
begin
  if p_code_hash is null or length(p_code_hash) < 32 then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if p_profile_id is null or v_email is null or v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_user');
  end if;

  select * into v_code
  from public.organization_access_codes
  where code_hash = p_code_hash
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  if v_code.status = 'revoked' or v_code.status = 'rotated' then
    return jsonb_build_object('ok', false, 'error', 'code_revoked');
  end if;

  if v_code.status = 'expired'
     or (v_code.expires_at is not null and v_code.expires_at <= v_now) then
    if v_code.status = 'active' then
      update public.organization_access_codes
      set status = 'expired'
      where id = v_code.id;
    end if;
    return jsonb_build_object('ok', false, 'error', 'code_expired');
  end if;

  if v_code.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  select * into v_org
  from public.organizations
  where id = v_code.organization_id
  for update;

  if not found or v_org.status <> 'active' then
    return jsonb_build_object('ok', false, 'error', 'organization_inactive');
  end if;

  if v_org.access_end_at is not null and v_org.access_end_at <= v_now then
    return jsonb_build_object('ok', false, 'error', 'organization_inactive');
  end if;

  if v_org.access_start_at is not null and v_org.access_start_at > v_now then
    return jsonb_build_object('ok', false, 'error', 'organization_inactive');
  end if;

  if v_org.billing_status in ('unpaid', 'past_due', 'cancelled') then
    return jsonb_build_object('ok', false, 'error', 'organization_inactive');
  end if;

  v_domain := split_part(v_email, '@', 2);

  if v_code.allowed_email_domain is not null
     and lower(v_code.allowed_email_domain) <> lower(v_domain) then
    return jsonb_build_object('ok', false, 'error', 'email_domain_not_approved');
  end if;

  if coalesce(array_length(v_org.approved_email_domains, 1), 0) > 0
     and not exists (
       select 1
       from unnest(v_org.approved_email_domains) as domain
       where lower(domain) = lower(v_domain)
     ) then
    return jsonb_build_object('ok', false, 'error', 'email_domain_not_approved');
  end if;

  if coalesce(array_length(v_org.approved_emails, 1), 0) > 0
     and not exists (
       select 1
       from unnest(v_org.approved_emails) as allowed
       where lower(allowed) = v_email
     ) then
    return jsonb_build_object('ok', false, 'error', 'email_domain_not_approved');
  end if;

  select * into v_member
  from public.organization_members
  where organization_id = v_org.id
    and (
      user_id = p_profile_id
      or lower(email) = v_email
    )
  order by case status
    when 'active' then 0
    when 'invited' then 1
    when 'suspended' then 2
    else 3
  end
  for update
  limit 1;

  if found and v_member.status = 'active' then
    return jsonb_build_object(
      'ok', false,
      'error', 'already_sponsored',
      'organization_id', v_org.id,
      'organization_name', v_org.name,
      'member_id', v_member.id
    );
  end if;

  -- Reactivation path: removed/suspended with reserved seat still occupied when suspended.
  if found and v_member.status = 'suspended' then
    return jsonb_build_object(
      'ok', false,
      'error', 'already_sponsored',
      'organization_id', v_org.id,
      'organization_name', v_org.name,
      'member_id', v_member.id
    );
  end if;

  select id into v_platinum_plan_id
  from public.plans
  where slug = 'plan-3'
  limit 1;

  if v_platinum_plan_id is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_code');
  end if;

  -- Ensure org content plan tracks Platinum for future capability lookups.
  if v_org.plan_id is distinct from v_platinum_plan_id then
    update public.organizations
    set plan_id = v_platinum_plan_id
    where id = v_org.id;
  end if;

  v_status := case
    when v_org.direct_activation then 'active'::public.organization_member_status
    else 'invited'::public.organization_member_status
  end;

  -- New seat occupancy check (removed members do not count).
  if not found or v_member.status = 'removed' then
    v_occupied := public.count_occupied_organization_seats(v_org.id);
    if v_org.seat_limit > 0 and v_occupied >= v_org.seat_limit then
      return jsonb_build_object('ok', false, 'error', 'seat_limit_reached');
    end if;
  end if;

  if found then
    update public.organization_members
    set
      user_id = p_profile_id,
      email = v_email,
      status = v_status,
      assigned_plan_id = coalesce(assigned_plan_id, v_platinum_plan_id),
      activated_at = case
        when v_status = 'active' then v_now
        else activated_at
      end,
      suspended_at = null,
      removed_at = null,
      updated_at = v_now
    where id = v_member.id
    returning * into v_member;
  else
    insert into public.organization_members (
      organization_id,
      user_id,
      email,
      role,
      status,
      assigned_plan_id,
      activated_at
    )
    values (
      v_org.id,
      p_profile_id,
      v_email,
      'member',
      v_status,
      v_platinum_plan_id,
      case when v_status = 'active' then v_now else null end
    )
    returning * into v_member;
  end if;

  return jsonb_build_object(
    'ok', true,
    'organization_id', v_org.id,
    'organization_name', v_org.name,
    'member_id', v_member.id,
    'member_status', v_member.status,
    'plan_id', v_platinum_plan_id,
    'direct_activation', v_org.direct_activation
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'already_sponsored');
end;
$$;

revoke all on function public.redeem_organization_access_code(text, uuid, text) from public;
grant execute on function public.redeem_organization_access_code(text, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.organization_access_codes enable row level security;
alter table public.organization_access_code_attempts enable row level security;

-- Org owners/admins can read code metadata for their org (never plaintext).
drop policy if exists organization_access_codes_select_org_admin
  on public.organization_access_codes;
create policy organization_access_codes_select_org_admin
  on public.organization_access_codes for select
  to authenticated
  using (
    exists (
      select 1
      from public.organization_members om
      join public.profiles pr on pr.id = om.user_id
      where om.organization_id = organization_access_codes.organization_id
        and pr.auth_user_id = auth.uid()
        and om.status = 'active'
        and om.role in ('owner', 'administrator')
    )
  );

-- Attempts are not readable by clients.
drop policy if exists organization_access_code_attempts_deny_select
  on public.organization_access_code_attempts;
create policy organization_access_code_attempts_deny_select
  on public.organization_access_code_attempts for select
  to authenticated
  using (false);

grant select on table public.organization_access_codes to authenticated, service_role;
grant select, insert, update, delete on table public.organization_access_codes to service_role;
grant select, insert, update, delete on table public.organization_access_code_attempts to service_role;
