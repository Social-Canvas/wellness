-- Locked certificate names: canonical profile field, atomic set-once,
-- issuance snapshot, and audited admin corrections.
-- Non-destructive: existing certificate rows are not rewritten.

-- ---------------------------------------------------------------------------
-- Enum: how the certificate name was set
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'certificate_name_set_source'
      and n.nspname = 'public'
  ) then
    create type public.certificate_name_set_source as enum (
      'signup',
      'onboarding',
      'admin_correction'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles: canonical locked certificate name
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists certificate_name text,
  add column if not exists certificate_name_locked_at timestamptz,
  add column if not exists certificate_name_set_source public.certificate_name_set_source,
  add column if not exists certificate_name_corrected_at timestamptz,
  add column if not exists certificate_name_corrected_by uuid references public.profiles (id) on delete set null;

comment on column public.profiles.certificate_name is
  'Exact name printed on certificates. Immutable for ordinary users once locked.';
comment on column public.profiles.certificate_name_locked_at is
  'When the user (or admin) confirmed the certificate name. Null means onboarding required.';
comment on column public.profiles.certificate_name_set_source is
  'signup | onboarding | admin_correction';
comment on column public.profiles.certificate_name_corrected_at is
  'Last admin correction timestamp; does not rewrite issued certificate snapshots.';
comment on column public.profiles.certificate_name_corrected_by is
  'Profile id of the admin who last corrected the certificate name.';

alter table public.profiles
  drop constraint if exists profiles_certificate_name_length_check;
alter table public.profiles
  add constraint profiles_certificate_name_length_check
  check (
    certificate_name is null
    or (
      char_length(certificate_name) between 2 and 100
      and certificate_name = btrim(certificate_name)
    )
  );

alter table public.profiles
  drop constraint if exists profiles_certificate_name_lock_consistency_check;
alter table public.profiles
  add constraint profiles_certificate_name_lock_consistency_check
  check (
    (certificate_name is null and certificate_name_locked_at is null and certificate_name_set_source is null)
    or (certificate_name is not null and certificate_name_locked_at is not null and certificate_name_set_source is not null)
  );

-- ---------------------------------------------------------------------------
-- Certificates: issuance-time recipient name snapshot
-- ---------------------------------------------------------------------------

alter table public.certificates
  add column if not exists recipient_name text;

comment on column public.certificates.recipient_name is
  'Snapshot of profiles.certificate_name at issuance. Never silently rewritten on profile correction.';

alter table public.certificates
  drop constraint if exists certificates_recipient_name_length_check;
alter table public.certificates
  add constraint certificates_recipient_name_length_check
  check (
    recipient_name is null
    or (
      char_length(recipient_name) between 2 and 100
      and recipient_name = btrim(recipient_name)
    )
  );

-- ---------------------------------------------------------------------------
-- Audit log for admin corrections (and explicit reissues)
-- ---------------------------------------------------------------------------

create table if not exists public.certificate_name_audit (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  previous_name text,
  new_name text not null,
  reason text not null,
  action public.certificate_name_set_source not null default 'admin_correction',
  corrected_by uuid not null references public.profiles (id) on delete restrict,
  certificate_id uuid references public.certificates (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint certificate_name_audit_reason_check
    check (char_length(btrim(reason)) between 3 and 500),
  constraint certificate_name_audit_new_name_check
    check (char_length(btrim(new_name)) between 2 and 100)
);

create index if not exists certificate_name_audit_profile_id_idx
  on public.certificate_name_audit (profile_id, created_at desc);

alter table public.certificate_name_audit enable row level security;

grant select, insert, update, delete on table public.certificate_name_audit to service_role;
-- No grants to authenticated/anon — admin paths use service role only.

-- ---------------------------------------------------------------------------
-- Block direct client writes to locked certificate-name columns
-- ---------------------------------------------------------------------------

create or replace function public.prevent_certificate_name_direct_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Security-definer helpers set this GUC for intentional writes.
  if current_setting('app.allow_certificate_name_write', true) = 'on' then
    return new;
  end if;

  -- service_role used by server admin clients may update via controlled services;
  -- still require the GUC so accidental updates cannot slip through PostgREST.
  if new.certificate_name is distinct from old.certificate_name
     or new.certificate_name_locked_at is distinct from old.certificate_name_locked_at
     or new.certificate_name_set_source is distinct from old.certificate_name_set_source
     or new.certificate_name_corrected_at is distinct from old.certificate_name_corrected_at
     or new.certificate_name_corrected_by is distinct from old.certificate_name_corrected_by
  then
    raise exception 'certificate_name fields cannot be updated directly'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_certificate_name_direct_update on public.profiles;
create trigger profiles_prevent_certificate_name_direct_update
before update on public.profiles
for each row
execute function public.prevent_certificate_name_direct_update();

-- Column-level privileges: authenticated may not update certificate fields.
revoke update on table public.profiles from authenticated;
grant update (
  full_name,
  phone,
  avatar_url,
  updated_at
) on table public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic set-once for the authenticated user
-- ---------------------------------------------------------------------------

create or replace function public.set_certificate_name_once(
  p_name text,
  p_source public.certificate_name_set_source default 'onboarding'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_uid uuid := auth.uid();
  v_normalized text;
  v_profile_id uuid;
  v_locked_at timestamptz;
  v_existing text;
begin
  if v_auth_uid is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'authentication_required',
      'message', 'You must be signed in.'
    );
  end if;

  if p_source is null or p_source = 'admin_correction' then
    return jsonb_build_object(
      'success', false,
      'error_code', 'validation_error',
      'message', 'Invalid certificate name source.'
    );
  end if;

  v_normalized := btrim(regexp_replace(coalesce(p_name, ''), '[[:space:]]+', ' ', 'g'));

  if char_length(v_normalized) < 2 or char_length(v_normalized) > 100 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'validation_error',
      'message', 'Enter a name between 2 and 100 characters.'
    );
  end if;

  -- Reject control characters / markup-like input (letters still required via regex).
  if v_normalized ~ '[[:cntrl:]]'
     or v_normalized ~ '[<>{}[\]\\]'
     or v_normalized !~ '[[:alpha:]]'
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'validation_error',
      'message', 'Enter a valid name using letters, spaces, and common punctuation.'
    );
  end if;

  select id, certificate_name, certificate_name_locked_at
    into v_profile_id, v_existing, v_locked_at
  from public.profiles
  where auth_user_id = v_auth_uid
  for update;

  if v_profile_id is null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'not_found',
      'message', 'Profile not found.'
    );
  end if;

  if v_locked_at is not null then
    return jsonb_build_object(
      'success', false,
      'error_code', 'already_locked',
      'message', 'Your certificate name is already confirmed and cannot be changed.',
      'certificate_name', v_existing
    );
  end if;

  perform set_config('app.allow_certificate_name_write', 'on', true);

  update public.profiles
  set
    certificate_name = v_normalized,
    certificate_name_locked_at = now(),
    certificate_name_set_source = p_source,
    full_name = coalesce(nullif(btrim(coalesce(full_name, '')), ''), v_normalized)
  where id = v_profile_id
    and certificate_name_locked_at is null;

  if not found then
    select certificate_name into v_existing
    from public.profiles
    where id = v_profile_id;

    return jsonb_build_object(
      'success', false,
      'error_code', 'already_locked',
      'message', 'Your certificate name is already confirmed and cannot be changed.',
      'certificate_name', v_existing
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'certificate_name', v_normalized,
    'set_source', p_source::text
  );
end;
$$;

revoke all on function public.set_certificate_name_once(text, public.certificate_name_set_source) from public;
grant execute on function public.set_certificate_name_once(text, public.certificate_name_set_source) to authenticated;
grant execute on function public.set_certificate_name_once(text, public.certificate_name_set_source) to service_role;

-- ---------------------------------------------------------------------------
-- Admin correction (service_role / security definer; app enforces role)
-- ---------------------------------------------------------------------------

create or replace function public.admin_correct_certificate_name(
  p_profile_id uuid,
  p_new_name text,
  p_reason text,
  p_admin_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text;
  v_reason text;
  v_previous text;
  v_admin_role public.user_role;
begin
  select role into v_admin_role
  from public.profiles
  where id = p_admin_profile_id;

  if v_admin_role is null or v_admin_role not in ('admin', 'super_admin') then
    return jsonb_build_object(
      'success', false,
      'error_code', 'forbidden',
      'message', 'Only administrators can correct certificate names.'
    );
  end if;

  v_normalized := btrim(regexp_replace(coalesce(p_new_name, ''), '[[:space:]]+', ' ', 'g'));
  v_reason := btrim(coalesce(p_reason, ''));

  if char_length(v_normalized) < 2 or char_length(v_normalized) > 100
     or v_normalized ~ '[[:cntrl:]]'
     or v_normalized ~ '[<>{}[\]\\]'
     or v_normalized !~ '[[:alpha:]]'
  then
    return jsonb_build_object(
      'success', false,
      'error_code', 'validation_error',
      'message', 'Enter a valid corrected certificate name.'
    );
  end if;

  if char_length(v_reason) < 3 or char_length(v_reason) > 500 then
    return jsonb_build_object(
      'success', false,
      'error_code', 'validation_error',
      'message', 'Provide a correction reason (3–500 characters).'
    );
  end if;

  select certificate_name into v_previous
  from public.profiles
  where id = p_profile_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error_code', 'not_found',
      'message', 'Member not found.'
    );
  end if;

  perform set_config('app.allow_certificate_name_write', 'on', true);

  update public.profiles
  set
    certificate_name = v_normalized,
    certificate_name_locked_at = coalesce(certificate_name_locked_at, now()),
    certificate_name_set_source = 'admin_correction',
    certificate_name_corrected_at = now(),
    certificate_name_corrected_by = p_admin_profile_id
  where id = p_profile_id;

  insert into public.certificate_name_audit (
    profile_id,
    previous_name,
    new_name,
    reason,
    action,
    corrected_by
  ) values (
    p_profile_id,
    v_previous,
    v_normalized,
    v_reason,
    'admin_correction',
    p_admin_profile_id
  );

  return jsonb_build_object(
    'success', true,
    'previous_name', to_jsonb(v_previous),
    'new_name', v_normalized
  );
end;
$$;

revoke all on function public.admin_correct_certificate_name(uuid, text, text, uuid) from public;
grant execute on function public.admin_correct_certificate_name(uuid, text, text, uuid) to service_role;
