-- Free Integration Journal: purchase modes + product entitlements (no Stripe for free claims).

create type public.product_purchase_mode as enum ('paid', 'free_claim', 'enquiry');

create type public.product_entitlement_source as enum (
  'free_claim',
  'purchase',
  'included'
);

alter table public.products
  add column purchase_mode public.product_purchase_mode not null default 'paid';

-- Existing $0 / no-Stripe catalog rows are enquiry offers, not free claims.
update public.products
set purchase_mode = 'enquiry'
where price_amount = 0
  and stripe_price_id is null
  and slug <> 'elevate-integration-journal';

alter table public.products
  add constraint products_purchase_mode_pricing_check check (
    (
      purchase_mode = 'paid'
      and price_amount > 0
    )
    or (
      purchase_mode = 'free_claim'
      and price_amount = 0
      and stripe_price_id is null
    )
    or (
      purchase_mode = 'enquiry'
      and stripe_price_id is null
    )
  );

create table public.product_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  source public.product_entitlement_source not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_entitlements_user_product_unique unique (user_id, product_id)
);

create index product_entitlements_user_id_idx
  on public.product_entitlements (user_id);

create index product_entitlements_product_id_idx
  on public.product_entitlements (product_id);

create trigger product_entitlements_set_updated_at
before update on public.product_entitlements
for each row execute function public.set_updated_at();

alter table public.product_entitlements enable row level security;

-- Users may read their own entitlements only. Mutations are server/service-role only.
create policy "product_entitlements_select_own"
  on public.product_entitlements for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = product_entitlements.user_id
        and profiles.auth_user_id = auth.uid()
    )
  );

revoke all on table public.product_entitlements from anon;
grant select on table public.product_entitlements to authenticated;
grant all on table public.product_entitlements to service_role;

-- Canonical free journal Shop product (file row may be linked after private upload).
insert into public.products (
  slug,
  title,
  description,
  product_type,
  purchase_mode,
  price_amount,
  currency,
  stripe_price_id,
  status
)
values (
  'elevate-integration-journal',
  'The Elevate Integration Journal',
  'A guided digital journal for reflection, nervous-system awareness and integration throughout your Elevate journey.',
  'digital_download',
  'free_claim',
  0,
  'usd',
  null,
  'published'
)
on conflict (slug) do update
set
  title = excluded.title,
  description = excluded.description,
  product_type = excluded.product_type,
  purchase_mode = excluded.purchase_mode,
  price_amount = excluded.price_amount,
  currency = excluded.currency,
  stripe_price_id = null,
  status = excluded.status,
  updated_at = now();

insert into public.product_files (
  product_id,
  storage_bucket,
  storage_path,
  file_name,
  mime_type,
  size_bytes
)
select
  p.id,
  'product-files',
  'digital-products/elevate-integration-journal/Elevate-Integration-Journal.pdf',
  'Elevate-Integration-Journal.pdf',
  'application/pdf',
  502740
from public.products as p
where p.slug = 'elevate-integration-journal'
  and not exists (
    select 1
    from public.product_files as pf
    where pf.product_id = p.id
      and pf.storage_path =
        'digital-products/elevate-integration-journal/Elevate-Integration-Journal.pdf'
  );

-- Keep Clean Living Recipes paid; never rewrite its Stripe price via this migration.
update public.products
set purchase_mode = 'paid'
where slug = 'ebook-1'
  and purchase_mode is distinct from 'paid';
