-- Ongoing Elevate membership recorded sessions archive.
-- Shared catalog for all active memberships (capability: session_replays).
-- Not a finite course; not a retail product; no Stripe changes.

-- ---------------------------------------------------------------------------
-- Focus enum (curriculum pillar; optional until editorial confirmation)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'recorded_session_focus'
      and n.nspname = 'public'
  ) then
    create type public.recorded_session_focus as enum (
      'awareness',
      'release',
      'embodiment',
      'integration'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Recorded sessions table
-- ---------------------------------------------------------------------------

create table if not exists public.recorded_sessions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  short_description text,
  recorded_at date,
  published_at timestamptz,
  duration_seconds integer,
  presenter text,
  monthly_theme text,
  week_number integer,
  weekly_topic text,
  focus public.recorded_session_focus,
  thumbnail_url text,
  mux_asset_id text unique,
  mux_playback_id text,
  processing_status public.video_status not null default 'draft',
  publication_status public.publish_status not null default 'draft',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recorded_sessions_duration_check
    check (duration_seconds is null or duration_seconds >= 0),
  constraint recorded_sessions_week_number_check
    check (week_number is null or week_number >= 1),
  constraint recorded_sessions_published_requires_ready_mux
    check (
      publication_status <> 'published'
      or (
        processing_status in ('ready', 'published')
        and mux_playback_id is not null
        and length(trim(mux_playback_id)) > 0
      )
    )
);

create index if not exists recorded_sessions_publication_status_idx
  on public.recorded_sessions (publication_status);

create index if not exists recorded_sessions_recorded_at_idx
  on public.recorded_sessions (recorded_at desc nulls last);

create index if not exists recorded_sessions_display_order_idx
  on public.recorded_sessions (display_order, recorded_at desc nulls last);

create index if not exists recorded_sessions_mux_asset_id_idx
  on public.recorded_sessions (mux_asset_id)
  where mux_asset_id is not null;

create index if not exists recorded_sessions_focus_idx
  on public.recorded_sessions (focus)
  where focus is not null;

create trigger recorded_sessions_set_updated_at
before update on public.recorded_sessions
for each row execute function public.set_updated_at();

-- Ensure existing `session_replays` capability description is accurate for this library.
update public.capabilities
set
  name = 'Recorded sessions',
  description = 'Access to the shared Elevate membership recorded sessions library'
where key = 'session_replays';

-- ---------------------------------------------------------------------------
-- RLS: members may read published rows only; mutations via service role only.
-- Application entitlement (session_replays) remains the authorization source of truth.
-- ---------------------------------------------------------------------------

alter table public.recorded_sessions enable row level security;

drop policy if exists recorded_sessions_select_published on public.recorded_sessions;
create policy recorded_sessions_select_published
  on public.recorded_sessions for select
  to authenticated
  using (publication_status = 'published');

-- No insert/update/delete policies for authenticated — service_role bypasses RLS.
-- Prevents member self-grant or draft exposure via the anon/authenticated clients.

grant select on table public.recorded_sessions to authenticated, service_role;
grant select, insert, update, delete on table public.recorded_sessions to service_role;
