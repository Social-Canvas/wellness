-- Enquiry / lead hardening for production launch:
-- canonical lead types, status workflow, notification tracking,
-- and service-role-only inserts (no privileged fields via anon).

alter type public.lead_type add value if not exists 'nonprofit';
alter type public.lead_type add value if not exists 'contact';

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'lead_status'
  ) then
    create type public.lead_status as enum (
      'new',
      'contacted',
      'qualified',
      'closed'
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'lead_notification_status'
  ) then
    create type public.lead_notification_status as enum (
      'pending',
      'sent',
      'failed',
      'skipped'
    );
  end if;
end
$$;

alter table public.leads
  add column if not exists status public.lead_status not null default 'new',
  add column if not exists organization_name text,
  add column if not exists estimated_participants text,
  add column if not exists interest text,
  add column if not exists notification_status public.lead_notification_status not null default 'pending',
  add column if not exists visitor_ack_status public.lead_notification_status not null default 'pending',
  add column if not exists last_notification_error text;

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_notification_status_idx on public.leads (notification_status);

-- Public forms submit through server actions + service role only.
drop policy if exists "leads_insert_public" on public.leads;
revoke insert on table public.leads from anon, authenticated;

comment on column public.leads.status is 'Admin workflow status for enquiries.';
comment on column public.leads.notification_status is 'Admin Resend notification delivery status.';
comment on column public.leads.visitor_ack_status is 'Visitor acknowledgement email status.';
comment on column public.leads.last_notification_error is 'Safe, non-secret summary of last notification failure.';
