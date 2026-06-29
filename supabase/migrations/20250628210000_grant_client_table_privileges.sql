-- Grant client table privileges required for existing RLS policies.
-- Without these grants, anon/authenticated receive "permission denied" before RLS runs.
-- RLS remains enabled and unchanged; server-only tables receive no client grants.

grant usage on schema public to anon, authenticated;

-- Profiles: authenticated users read/update own row
grant select, update on table public.profiles to authenticated;

-- Catalog: public read for active/published rows
grant select on table public.plans to anon, authenticated;
grant select on table public.plan_prices to anon, authenticated;
grant select on table public.courses to anon, authenticated;
grant select on table public.modules to anon, authenticated;
grant select on table public.lessons to anon, authenticated;
grant select on table public.videos to anon, authenticated;
grant select on table public.products to anon, authenticated;
grant select on table public.live_classes to anon, authenticated;

-- Subscriptions: authenticated users read own rows
grant select on table public.subscriptions to authenticated;

-- Progress & certificates: authenticated users read/write own rows
grant select, insert, update on table public.video_progress to authenticated;
grant select, insert, update on table public.course_progress to authenticated;
grant select on table public.certificates to authenticated;

-- Orders: authenticated users read own rows
grant select on table public.orders to authenticated;
grant select on table public.order_items to authenticated;

-- Leads: public insert only
grant insert on table public.leads to anon, authenticated;

-- content_access, product_files, webhook_events, integration_jobs:
-- intentionally omitted — service role / server-only paths only
