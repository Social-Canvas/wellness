-- Non-destructive bot review flags for profiles and leads.
-- Admin/service_role writes only. Does not delete or auto-flag existing rows.

alter table public.profiles
  add column if not exists suspected_bot boolean not null default false,
  add column if not exists bot_reason text,
  add column if not exists bot_flagged_at timestamptz,
  add column if not exists bot_flagged_by uuid references public.profiles (id) on delete set null;

alter table public.leads
  add column if not exists suspected_bot boolean not null default false,
  add column if not exists bot_reason text,
  add column if not exists bot_flagged_at timestamptz,
  add column if not exists bot_flagged_by uuid references public.profiles (id) on delete set null;

create index if not exists profiles_suspected_bot_idx
  on public.profiles (suspected_bot, created_at desc);

create index if not exists leads_suspected_bot_idx
  on public.leads (suspected_bot, created_at desc);

comment on column public.profiles.suspected_bot is
  'Admin review flag. Never used as sole authorization. Does not delete the account.';
comment on column public.leads.suspected_bot is
  'Admin review flag. Does not delete the enquiry.';

-- Prevent authenticated users from self-granting roles or rewriting bot flags.
create or replace function public.protect_privileged_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.role := old.role;
    new.suspected_bot := old.suspected_bot;
    new.bot_reason := old.bot_reason;
    new.bot_flagged_at := old.bot_flagged_at;
    new.bot_flagged_by := old.bot_flagged_by;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_columns on public.profiles;
create trigger profiles_protect_privileged_columns
before update on public.profiles
for each row execute function public.protect_privileged_profile_columns();

create or replace function public.protect_lead_bot_columns()
returns trigger
language plpgsql
as $$
begin
  if auth.role() is distinct from 'service_role' then
    new.suspected_bot := old.suspected_bot;
    new.bot_reason := old.bot_reason;
    new.bot_flagged_at := old.bot_flagged_at;
    new.bot_flagged_by := old.bot_flagged_by;
  end if;
  return new;
end;
$$;

drop trigger if exists leads_protect_bot_columns on public.leads;
create trigger leads_protect_bot_columns
before update on public.leads
for each row execute function public.protect_lead_bot_columns();
