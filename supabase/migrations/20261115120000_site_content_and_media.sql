-- Public marketing copy and images editable from /admin/content.
-- Service role writes only. Public pages read through the server.
-- Does not store secrets, prices, or Stripe identifiers.

create table public.site_content (
  key text primary key,
  group_key text not null,
  label text not null,
  help_text text,
  field_type text not null,
  value text not null default '',
  alt_text text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  constraint site_content_field_type_chk check (
    field_type in ('text', 'textarea', 'lines', 'url', 'image')
  )
);

create index site_content_group_idx on public.site_content (group_key, sort_order);

create trigger site_content_set_updated_at
before update on public.site_content
for each row execute function public.set_updated_at();

alter table public.site_content enable row level security;

revoke all on table public.site_content from anon, authenticated;

comment on table public.site_content is
  'Structured public marketing copy. Blank values fall back to code defaults. Does not grant entitlements.';

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_bucket text not null default 'site-media',
  storage_path text not null,
  public_url text not null,
  alt_text text not null default '',
  mime_type text not null,
  size_bytes integer not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint media_assets_bucket_path_key unique (storage_bucket, storage_path),
  constraint media_assets_size_chk check (size_bytes > 0 and size_bytes <= 5242880),
  constraint media_assets_bucket_chk check (storage_bucket = 'site-media')
);

create index media_assets_created_at_idx on public.media_assets (created_at desc);

alter table public.media_assets enable row level security;

revoke all on table public.media_assets from anon, authenticated;

comment on table public.media_assets is
  'Admin-uploaded public marketing images. Paths are unique. Product downloads stay in the private product-files bucket.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No client insert/update/delete policies. Service role uploads after an admin check.
-- Public bucket URLs are readable without a listing policy.
