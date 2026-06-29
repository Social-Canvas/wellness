-- Grant service_role privileges for admin and server-only paths.
-- service_role bypasses RLS but still requires schema and table-level grants.

grant usage on schema public to service_role;

grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.plans to service_role;
grant select, insert, update, delete on table public.plan_prices to service_role;
grant select, insert, update, delete on table public.subscriptions to service_role;
grant select, insert, update, delete on table public.courses to service_role;
grant select, insert, update, delete on table public.modules to service_role;
grant select, insert, update, delete on table public.lessons to service_role;
grant select, insert, update, delete on table public.videos to service_role;
grant select, insert, update, delete on table public.content_access to service_role;
grant select, insert, update, delete on table public.video_progress to service_role;
grant select, insert, update, delete on table public.course_progress to service_role;
grant select, insert, update, delete on table public.certificates to service_role;
grant select, insert, update, delete on table public.products to service_role;
grant select, insert, update, delete on table public.product_files to service_role;
grant select, insert, update, delete on table public.orders to service_role;
grant select, insert, update, delete on table public.order_items to service_role;
grant select, insert, update, delete on table public.leads to service_role;
grant select, insert, update, delete on table public.live_classes to service_role;
grant select, insert, update, delete on table public.webhook_events to service_role;
grant select, insert, update, delete on table public.integration_jobs to service_role;
