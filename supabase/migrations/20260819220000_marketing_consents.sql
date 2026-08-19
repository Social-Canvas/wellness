-- Explicit marketing consent records (separate from profiles / transactional email).
-- Inserts and Kit sync run server-side via service role only.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'marketing_consent_status'
  ) then
    create type public.marketing_consent_status as enum (
      'active',
      'unsubscribed'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'kit_sync_status'
  ) then
    create type public.kit_sync_status as enum (
      'pending',
      'synced',
      'failed',
      'skipped'
    );
  end if;
end
$$;

create table public.marketing_consents (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references public.profiles (id) on delete set null,
  status public.marketing_consent_status not null default 'active',
  source text not null,
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  kit_subscriber_id bigint,
  kit_sync_status public.kit_sync_status not null default 'pending',
  kit_last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketing_consents_email_normalized_chk check (email = lower(trim(email)))
);

create unique index marketing_consents_email_uidx on public.marketing_consents (email);
create index marketing_consents_user_id_idx on public.marketing_consents (user_id);
create index marketing_consents_kit_sync_status_idx on public.marketing_consents (kit_sync_status);
create index marketing_consents_status_idx on public.marketing_consents (status);

create trigger marketing_consents_set_updated_at
before update on public.marketing_consents
for each row execute function public.set_updated_at();

alter table public.marketing_consents enable row level security;

-- Service role only — no client grants (see grant_client_table_privileges migration pattern).
revoke all on table public.marketing_consents from anon, authenticated;

comment on table public.marketing_consents is
  'Explicit marketing opt-in consent. Never inferred from purchase, signup, or membership.';
comment on column public.marketing_consents.email is
  'Normalized lowercase email. Unique across consent records.';
comment on column public.marketing_consents.kit_last_sync_error is
  'Safe, non-secret summary of last Kit sync failure.';
