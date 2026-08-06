-- Course-scoped downloadable resources (workbooks, slides, summaries).
-- Private storage only; downloads via short-lived signed URLs after canAccessCourse.

create table if not exists public.course_resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  slug text not null,
  title text not null,
  description text,
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  storage_bucket text not null default 'course-resources',
  storage_path text not null,
  sort_order integer not null default 0,
  status public.publish_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, slug),
  unique (storage_bucket, storage_path)
);

create index if not exists course_resources_course_id_sort_idx
  on public.course_resources (course_id, sort_order);

alter table public.course_resources enable row level security;

drop policy if exists "course_resources_no_anon_select" on public.course_resources;
drop policy if exists "course_resources_no_authenticated_select" on public.course_resources;

-- Deny direct client reads; service role bypasses RLS for entitlement-gated signed URLs.
create policy "course_resources_no_anon_select"
on public.course_resources
for select
to anon
using (false);

create policy "course_resources_no_authenticated_select"
on public.course_resources
for select
to authenticated
using (false);

grant select, insert, update, delete on public.course_resources to service_role;

-- Private course-resources bucket (PDF / Office docs). No public/anon read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-resources',
  'course-resources',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/msword'
  ]::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course_resources_storage_no_anon_select" on storage.objects;
drop policy if exists "course_resources_storage_no_authenticated_select" on storage.objects;

create policy "course_resources_storage_no_anon_select"
on storage.objects
for select
to anon
using (bucket_id = 'course-resources' and false);

create policy "course_resources_storage_no_authenticated_select"
on storage.objects
for select
to authenticated
using (bucket_id = 'course-resources' and false);

-- Wire Autoimmune product → course entitlement (purchase unlocks course + resources).
update public.products p
set granted_course_id = c.id,
    updated_at = now()
from public.courses c
where p.slug = 'autoimmune-masterclass'
  and c.slug = 'autoimmune-masterclass'
  and p.granted_course_id is distinct from c.id;
