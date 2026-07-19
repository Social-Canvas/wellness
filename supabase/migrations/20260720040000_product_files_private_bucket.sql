-- Private product-files bucket for protected digital downloads (ebooks).
-- Downloads are issued only via short-lived signed URLs after server entitlement checks.
-- No public/anon read policies are created.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-files',
  'product-files',
  false,
  52428800,
  array['application/pdf']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Deny anonymous and authenticated direct storage access; service role bypasses RLS.
drop policy if exists "product_files_no_anon_select" on storage.objects;
drop policy if exists "product_files_no_authenticated_select" on storage.objects;

create policy "product_files_no_anon_select"
on storage.objects
for select
to anon
using (bucket_id = 'product-files' and false);

create policy "product_files_no_authenticated_select"
on storage.objects
for select
to authenticated
using (bucket_id = 'product-files' and false);
