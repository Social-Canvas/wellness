-- Append-only hashed email/IP attempt log for public form rate limits.
-- Service role / server only. Does not store raw email or IP. Does not delete rows.

create table if not exists public.public_form_rate_limits (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('lead', 'signup', 'auth_email')),
  key_type text not null check (key_type in ('email', 'ip')),
  key_hash text not null,
  created_at timestamptz not null default now()
);

create index if not exists public_form_rate_limits_lookup_idx
  on public.public_form_rate_limits (scope, key_type, key_hash, created_at desc);

comment on table public.public_form_rate_limits is
  'Durable public-form rate limit events. Hashed email/IP only. Service role writes; never client-readable.';

alter table public.public_form_rate_limits enable row level security;

drop policy if exists public_form_rate_limits_deny_all
  on public.public_form_rate_limits;
create policy public_form_rate_limits_deny_all
  on public.public_form_rate_limits
  for all
  to anon, authenticated
  using (false)
  with check (false);

revoke all on table public.public_form_rate_limits from public, anon, authenticated;
grant select, insert on table public.public_form_rate_limits to service_role;
