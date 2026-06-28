-- Initial schema: profiles, billing, content, progress, commerce, leads, integrations

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('user', 'admin', 'super_admin');

create type public.billing_interval as enum ('monthly', 'yearly');

create type public.subscription_status as enum (
  'active',
  'trialing',
  'past_due',
  'unpaid',
  'canceled',
  'incomplete',
  'incomplete_expired',
  'paused'
);

create type public.publish_status as enum ('draft', 'published', 'archived');

create type public.video_status as enum (
  'uploading',
  'processing',
  'ready',
  'failed',
  'draft',
  'published',
  'archived'
);

create type public.migration_status as enum (
  'not_started',
  'uploaded',
  'verified',
  'failed'
);

create type public.content_type as enum ('course', 'module', 'lesson', 'video');

create type public.product_type as enum (
  'ebook',
  'digital_download',
  'bundle',
  'masterclass',
  'session'
);

create type public.order_status as enum (
  'pending',
  'paid',
  'failed',
  'refunded',
  'disputed'
);

create type public.lead_type as enum (
  'vip',
  'retreat',
  'private_event',
  'free_taster'
);

create type public.ghl_sync_status as enum ('pending', 'synced', 'failed');

create type public.live_class_access as enum (
  'public',
  'authenticated',
  'member_only',
  'plan_specific'
);

create type public.webhook_provider as enum ('stripe', 'mux', 'calendly', 'resend');

create type public.webhook_event_status as enum (
  'received',
  'processed',
  'failed',
  'ignored'
);

create type public.integration_job_type as enum (
  'ghl_sync',
  'send_email',
  'issue_certificate',
  'process_video',
  'retry_webhook'
);

create type public.integration_job_status as enum (
  'pending',
  'processing',
  'completed',
  'failed'
);

-- ---------------------------------------------------------------------------
-- Utilities
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles & billing
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  role public.user_role not null default 'user',
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_stripe_customer_id_idx on public.profiles (stripe_customer_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger plans_set_updated_at
before update on public.plans
for each row execute function public.set_updated_at();

create table public.plan_prices (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete restrict,
  stripe_price_id text not null unique,
  billing_interval public.billing_interval not null,
  currency text not null default 'usd',
  amount integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index plan_prices_plan_id_idx on public.plan_prices (plan_id);

create trigger plan_prices_set_updated_at
before update on public.plan_prices
for each row execute function public.set_updated_at();

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id uuid not null references public.plans (id) on delete restrict,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  stripe_price_id text not null,
  status public.subscription_status not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_id_idx on public.subscriptions (user_id);
create index subscriptions_status_idx on public.subscriptions (status);
create index subscriptions_current_period_end_idx
  on public.subscriptions (current_period_end);

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  thumbnail_url text,
  status public.publish_status not null default 'draft',
  sort_order integer not null default 0,
  certificate_enabled boolean not null default false,
  completion_threshold integer not null default 90,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_completion_threshold_check
    check (completion_threshold between 1 and 100)
);

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create table public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  status public.publish_status not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug)
);

create index modules_course_id_idx on public.modules (course_id);

create trigger modules_set_updated_at
before update on public.modules
for each row execute function public.set_updated_at();

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  mux_asset_id text unique,
  mux_playback_id text,
  title text not null,
  description text,
  duration_seconds integer,
  thumbnail_url text,
  status public.video_status not null default 'draft',
  published_at timestamptz,
  scheduled_at timestamptz,
  migration_status public.migration_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index videos_mux_asset_id_idx on public.videos (mux_asset_id);
create index videos_status_idx on public.videos (status);

create trigger videos_set_updated_at
before update on public.videos
for each row execute function public.set_updated_at();

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules (id) on delete cascade,
  video_id uuid references public.videos (id) on delete set null,
  slug text not null,
  title text not null,
  description text,
  sort_order integer not null default 0,
  is_required boolean not null default true,
  status public.publish_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, slug)
);

create index lessons_module_id_idx on public.lessons (module_id);
create index lessons_video_id_idx on public.lessons (video_id);

create trigger lessons_set_updated_at
before update on public.lessons
for each row execute function public.set_updated_at();

create table public.content_access (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  content_type public.content_type not null,
  content_id uuid not null,
  created_at timestamptz not null default now(),
  unique (plan_id, content_type, content_id)
);

create index content_access_plan_id_idx on public.content_access (plan_id);
create index content_access_content_idx
  on public.content_access (content_type, content_id);

-- ---------------------------------------------------------------------------
-- Progress & certificates
-- ---------------------------------------------------------------------------

create table public.video_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  video_id uuid not null references public.videos (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete set null,
  last_position_seconds integer not null default 0,
  watched_seconds integer not null default 0,
  progress_percentage integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, video_id),
  constraint video_progress_last_position_check check (last_position_seconds >= 0),
  constraint video_progress_watched_seconds_check check (watched_seconds >= 0),
  constraint video_progress_percentage_check
    check (progress_percentage between 0 and 100)
);

create index video_progress_user_id_idx on public.video_progress (user_id);

create trigger video_progress_set_updated_at
before update on public.video_progress
for each row execute function public.set_updated_at();

create table public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  progress_percentage integer not null default 0,
  completed_lessons integer not null default 0,
  total_lessons integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id),
  constraint course_progress_percentage_check
    check (progress_percentage between 0 and 100)
);

create index course_progress_user_id_idx on public.course_progress (user_id);

create trigger course_progress_set_updated_at
before update on public.course_progress
for each row execute function public.set_updated_at();

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  certificate_number text not null unique,
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete restrict,
  issued_at timestamptz not null default now(),
  pdf_storage_path text,
  verification_token text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index certificates_user_id_idx on public.certificates (user_id);
create index certificates_verification_token_idx
  on public.certificates (verification_token);

create trigger certificates_set_updated_at
before update on public.certificates
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Commerce
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  product_type public.product_type not null,
  price_amount integer not null,
  currency text not null default 'usd',
  stripe_price_id text unique,
  cover_image_url text,
  status public.publish_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create table public.product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index product_files_product_id_idx on public.product_files (product_id);

create trigger product_files_set_updated_at
before update on public.product_files
for each row execute function public.set_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  status public.order_status not null default 'pending',
  amount_paid integer not null default 0,
  currency text not null default 'usd',
  purchased_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_user_id_idx on public.orders (user_id);
create index orders_stripe_checkout_session_id_idx
  on public.orders (stripe_checkout_session_id);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null default 1,
  unit_amount integer not null,
  currency text not null default 'usd',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_quantity_check check (quantity > 0)
);

create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_product_id_idx on public.order_items (product_id);

create trigger order_items_set_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Leads & live classes
-- ---------------------------------------------------------------------------

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  lead_type public.lead_type not null,
  name text not null,
  email text not null,
  phone text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  source text,
  ghl_contact_id text,
  ghl_sync_status public.ghl_sync_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_lead_type_idx on public.leads (lead_type);
create index leads_ghl_sync_status_idx on public.leads (ghl_sync_status);

create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

create table public.live_classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  calendly_url text not null,
  zoom_join_url text,
  access_type public.live_class_access not null default 'public',
  plan_id uuid references public.plans (id) on delete set null,
  status public.publish_status not null default 'draft',
  starts_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger live_classes_set_updated_at
before update on public.live_classes
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Integrations
-- ---------------------------------------------------------------------------

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider public.webhook_provider not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status public.webhook_event_status not null default 'received',
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create index webhook_events_status_idx on public.webhook_events (status);

create table public.integration_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type public.integration_job_type not null,
  status public.integration_job_status not null default 'pending',
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  max_attempts integer not null default 5,
  next_run_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index integration_jobs_status_next_run_at_idx
  on public.integration_jobs (status, next_run_at);

create trigger integration_jobs_set_updated_at
before update on public.integration_jobs
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth: auto-create profile on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.plans enable row level security;
alter table public.plan_prices enable row level security;
alter table public.subscriptions enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.videos enable row level security;
alter table public.content_access enable row level security;
alter table public.video_progress enable row level security;
alter table public.course_progress enable row level security;
alter table public.certificates enable row level security;
alter table public.products enable row level security;
alter table public.product_files enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.leads enable row level security;
alter table public.live_classes enable row level security;
alter table public.webhook_events enable row level security;
alter table public.integration_jobs enable row level security;

-- Profiles
create policy "profiles_select_own"
  on public.profiles for select
  using (auth_user_id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (auth_user_id = auth.uid());

-- Catalog (public read placeholders)
create policy "plans_select_active"
  on public.plans for select
  using (is_active = true);

create policy "plan_prices_select_active"
  on public.plan_prices for select
  using (is_active = true);

create policy "courses_select_published"
  on public.courses for select
  using (status = 'published');

create policy "modules_select_published"
  on public.modules for select
  using (
    status = 'published'
    and exists (
      select 1
      from public.courses
      where courses.id = modules.course_id
        and courses.status = 'published'
    )
  );

create policy "lessons_select_published_modules"
  on public.lessons for select
  using (
    status = 'published'
    and exists (
      select 1
      from public.modules
      join public.courses on courses.id = modules.course_id
      where modules.id = lessons.module_id
        and modules.status = 'published'
        and courses.status = 'published'
    )
  );

create policy "videos_select_published"
  on public.videos for select
  using (status = 'published');

create policy "products_select_published"
  on public.products for select
  using (status = 'published');

create policy "live_classes_select_published"
  on public.live_classes for select
  using (status = 'published');

-- Subscriptions
create policy "subscriptions_select_own"
  on public.subscriptions for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = subscriptions.user_id
        and profiles.auth_user_id = auth.uid()
    )
  );

-- User-owned progress & certificates
create policy "video_progress_select_own"
  on public.video_progress for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = video_progress.user_id
        and profiles.auth_user_id = auth.uid()
    )
  );

create policy "video_progress_insert_own"
  on public.video_progress for insert
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = video_progress.user_id
        and profiles.auth_user_id = auth.uid()
    )
  );

create policy "video_progress_update_own"
  on public.video_progress for update
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = video_progress.user_id
        and profiles.auth_user_id = auth.uid()
    )
  );

create policy "course_progress_select_own"
  on public.course_progress for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = course_progress.user_id
        and profiles.auth_user_id = auth.uid()
    )
  );

create policy "course_progress_insert_own"
  on public.course_progress for insert
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = course_progress.user_id
        and profiles.auth_user_id = auth.uid()
    )
  );

create policy "course_progress_update_own"
  on public.course_progress for update
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = course_progress.user_id
        and profiles.auth_user_id = auth.uid()
    )
  );

create policy "certificates_select_own"
  on public.certificates for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = certificates.user_id
        and profiles.auth_user_id = auth.uid()
    )
  );

-- Orders
create policy "orders_select_own"
  on public.orders for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = orders.user_id
        and profiles.auth_user_id = auth.uid()
    )
  );

create policy "order_items_select_own"
  on public.order_items for select
  using (
    exists (
      select 1
      from public.orders
      join public.profiles on profiles.id = orders.user_id
      where orders.id = order_items.order_id
        and profiles.auth_user_id = auth.uid()
    )
  );

-- Leads: public insert only (reads via service role / admin later)
create policy "leads_insert_public"
  on public.leads for insert
  with check (true);

-- content_access, product_files, webhook_events, integration_jobs:
-- no client policies yet — service role / server actions only
