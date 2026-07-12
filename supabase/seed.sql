-- Initial catalog seed from docs/reference/Scope_of_Work.pdf
-- Idempotent: existing rows are left unchanged (ON CONFLICT DO NOTHING / NOT EXISTS guards).

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------

insert into public.plans (slug, name, description, sort_order, is_active)
values
  (
    'plan-1',
    'Plan 1',
    'All 21 meditation classes (5 min each) plus the core course library (~30 videos, 20–40 min). New content added every week.',
    1,
    true
  ),
  (
    'plan-2',
    'Plan 2',
    'Everything in Plan 1, plus two virtual live sessions per month (recorded and added to the session library).',
    2,
    true
  ),
  (
    'plan-3',
    'Plan 3',
    'Everything in Plan 2, plus one in-person live session per month and monthly member extras.',
    3,
    true
  )
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Plan prices (placeholder Stripe price IDs — amounts still to confirm)
-- ---------------------------------------------------------------------------

insert into public.plan_prices (plan_id, stripe_price_id, billing_interval, currency, amount, is_active)
select p.id, 'price_placeholder_plan_1_monthly', 'monthly', 'usd', 0, true
from public.plans p
where p.slug = 'plan-1'
on conflict (stripe_price_id) do nothing;

insert into public.plan_prices (plan_id, stripe_price_id, billing_interval, currency, amount, is_active)
select p.id, 'price_placeholder_plan_1_yearly', 'yearly', 'usd', 0, true
from public.plans p
where p.slug = 'plan-1'
on conflict (stripe_price_id) do nothing;

insert into public.plan_prices (plan_id, stripe_price_id, billing_interval, currency, amount, is_active)
select p.id, 'price_placeholder_plan_2_monthly', 'monthly', 'usd', 0, true
from public.plans p
where p.slug = 'plan-2'
on conflict (stripe_price_id) do nothing;

insert into public.plan_prices (plan_id, stripe_price_id, billing_interval, currency, amount, is_active)
select p.id, 'price_placeholder_plan_2_yearly', 'yearly', 'usd', 0, true
from public.plans p
where p.slug = 'plan-2'
on conflict (stripe_price_id) do nothing;

insert into public.plan_prices (plan_id, stripe_price_id, billing_interval, currency, amount, is_active)
select p.id, 'price_placeholder_plan_3_monthly', 'monthly', 'usd', 0, true
from public.plans p
where p.slug = 'plan-3'
on conflict (stripe_price_id) do nothing;

insert into public.plan_prices (plan_id, stripe_price_id, billing_interval, currency, amount, is_active)
select p.id, 'price_placeholder_plan_3_yearly', 'yearly', 'usd', 0, true
from public.plans p
where p.slug = 'plan-3'
on conflict (stripe_price_id) do nothing;

-- ---------------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------------

insert into public.courses (
  slug,
  title,
  description,
  status,
  sort_order,
  certificate_enabled,
  completion_threshold
)
values
  (
    '7-day-reset-meditation-series',
    'The 7-Day Elevated Reset',
    'A guided seven-day nervous system reset — welcome orientation plus daily morning meditations, afternoon regroup sessions, and evening meditations.',
    'draft',
    1,
    false,
    90
  ),
  (
    'core-course-library',
    'Core Course Library',
    'Foundational wellness courses with new recordings added every week.',
    'published',
    2,
    false,
    90
  ),
  (
    'autoimmune-masterclass',
    'Autoimmune Masterclass',
    'Five in-depth sessions on autoimmune wellness, including workbook support and a completion certificate.',
    'published',
    3,
    true,
    90
  ),
  (
    'health-professional-session',
    'Health Professional Session',
    'A two-hour recorded session designed for health professionals.',
    'published',
    4,
    false,
    90
  ),
  (
    'free-taster',
    'Free Taster',
    'A free sample session — public preview, no membership required.',
    'published',
    5,
    false,
    90
  ),
  (
    'virtual-live-session-library',
    'Virtual Live Session Library',
    'Placeholder library for recorded virtual live sessions (Plan 2+). Content added on an ongoing basis.',
    'published',
    6,
    false,
    90
  ),
  (
    'in-person-monthly-extras',
    'In-Person & Monthly Extras',
    'Placeholder library for Plan 3 in-person sessions and monthly member extras.',
    'published',
    7,
    false,
    90
  )
on conflict (slug) do nothing;

-- One main module per course (except 7-Day Elevated Reset — structured separately below)
insert into public.modules (course_id, slug, title, description, status, sort_order)
select c.id, 'main', c.title, c.description, c.status, 0
from public.courses c
where c.slug in (
  'core-course-library',
  'autoimmune-masterclass',
  'health-professional-session',
  'free-taster',
  'virtual-live-session-library',
  'in-person-monthly-extras'
)
on conflict (course_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- The 7-Day Elevated Reset: Welcome + 7 days × (Morning / Afternoon / Evening)
-- Videos are draft until Mux assets are uploaded via Admin → Videos.
-- Course, modules, and lessons remain draft until media is ready for launch.
-- ---------------------------------------------------------------------------

insert into public.modules (course_id, slug, title, description, status, sort_order)
select
  c.id,
  m.slug,
  m.title,
  m.description,
  'draft',
  m.sort_order
from public.courses c
cross join (
  values
    ('welcome', 'Welcome', 'Start here before Day 1.', 0),
    ('day-1', 'Day 1', 'Morning, afternoon, and evening sessions for Day 1.', 1),
    ('day-2', 'Day 2', 'Morning, afternoon, and evening sessions for Day 2.', 2),
    ('day-3', 'Day 3', 'Morning, afternoon, and evening sessions for Day 3.', 3),
    ('day-4', 'Day 4', 'Morning, afternoon, and evening sessions for Day 4.', 4),
    ('day-5', 'Day 5', 'Morning, afternoon, and evening sessions for Day 5.', 5),
    ('day-6', 'Day 6', 'Morning, afternoon, and evening sessions for Day 6.', 6),
    ('day-7', 'Day 7', 'Morning, afternoon, and evening sessions for Day 7.', 7)
) as m(slug, title, description, sort_order)
where c.slug = '7-day-reset-meditation-series'
on conflict (course_id, slug) do nothing;

insert into public.videos (title, status, migration_status)
select v.title, 'draft', 'not_started'
from (
  values
    ('7-Day Elevated Reset — Welcome'),
    ('7-Day Elevated Reset — Day 1 Morning Meditation'),
    ('7-Day Elevated Reset — Day 1 Afternoon Regroup / Refocus'),
    ('7-Day Elevated Reset — Day 1 Evening Meditation'),
    ('7-Day Elevated Reset — Day 2 Morning Meditation'),
    ('7-Day Elevated Reset — Day 2 Afternoon Regroup / Refocus'),
    ('7-Day Elevated Reset — Day 2 Evening Meditation'),
    ('7-Day Elevated Reset — Day 3 Morning Meditation'),
    ('7-Day Elevated Reset — Day 3 Afternoon Regroup / Refocus'),
    ('7-Day Elevated Reset — Day 3 Evening Meditation'),
    ('7-Day Elevated Reset — Day 4 Morning Meditation'),
    ('7-Day Elevated Reset — Day 4 Afternoon Regroup / Refocus'),
    ('7-Day Elevated Reset — Day 4 Evening Meditation'),
    ('7-Day Elevated Reset — Day 5 Morning Meditation'),
    ('7-Day Elevated Reset — Day 5 Afternoon Regroup / Refocus'),
    ('7-Day Elevated Reset — Day 5 Evening Meditation'),
    ('7-Day Elevated Reset — Day 6 Morning Meditation'),
    ('7-Day Elevated Reset — Day 6 Afternoon Regroup / Refocus'),
    ('7-Day Elevated Reset — Day 6 Evening Meditation'),
    ('7-Day Elevated Reset — Day 7 Morning Meditation'),
    ('7-Day Elevated Reset — Day 7 Afternoon Regroup / Refocus'),
    ('7-Day Elevated Reset — Day 7 Evening Meditation')
) as v(title)
where not exists (select 1 from public.videos existing where existing.title = v.title);

insert into public.lessons (module_id, video_id, slug, title, sort_order, status)
select
  mod.id,
  vid.id,
  l.lesson_slug,
  l.lesson_title,
  l.sort_order,
  'draft'
from (
  values
    ('welcome', 'welcome', 'Welcome', '7-Day Elevated Reset — Welcome', 1),
    ('day-1', 'morning', 'Day 1: Morning Meditation', '7-Day Elevated Reset — Day 1 Morning Meditation', 1),
    ('day-1', 'afternoon', 'Day 1: Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 1 Afternoon Regroup / Refocus', 2),
    ('day-1', 'evening', 'Day 1: Evening Meditation', '7-Day Elevated Reset — Day 1 Evening Meditation', 3),
    ('day-2', 'morning', 'Day 2: Morning Meditation', '7-Day Elevated Reset — Day 2 Morning Meditation', 1),
    ('day-2', 'afternoon', 'Day 2: Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 2 Afternoon Regroup / Refocus', 2),
    ('day-2', 'evening', 'Day 2: Evening Meditation', '7-Day Elevated Reset — Day 2 Evening Meditation', 3),
    ('day-3', 'morning', 'Day 3: Morning Meditation', '7-Day Elevated Reset — Day 3 Morning Meditation', 1),
    ('day-3', 'afternoon', 'Day 3: Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 3 Afternoon Regroup / Refocus', 2),
    ('day-3', 'evening', 'Day 3: Evening Meditation', '7-Day Elevated Reset — Day 3 Evening Meditation', 3),
    ('day-4', 'morning', 'Day 4: Morning Meditation', '7-Day Elevated Reset — Day 4 Morning Meditation', 1),
    ('day-4', 'afternoon', 'Day 4: Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 4 Afternoon Regroup / Refocus', 2),
    ('day-4', 'evening', 'Day 4: Evening Meditation', '7-Day Elevated Reset — Day 4 Evening Meditation', 3),
    ('day-5', 'morning', 'Day 5: Morning Meditation', '7-Day Elevated Reset — Day 5 Morning Meditation', 1),
    ('day-5', 'afternoon', 'Day 5: Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 5 Afternoon Regroup / Refocus', 2),
    ('day-5', 'evening', 'Day 5: Evening Meditation', '7-Day Elevated Reset — Day 5 Evening Meditation', 3),
    ('day-6', 'morning', 'Day 6: Morning Meditation', '7-Day Elevated Reset — Day 6 Morning Meditation', 1),
    ('day-6', 'afternoon', 'Day 6: Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 6 Afternoon Regroup / Refocus', 2),
    ('day-6', 'evening', 'Day 6: Evening Meditation', '7-Day Elevated Reset — Day 6 Evening Meditation', 3),
    ('day-7', 'morning', 'Day 7: Morning Meditation', '7-Day Elevated Reset — Day 7 Morning Meditation', 1),
    ('day-7', 'afternoon', 'Day 7: Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 7 Afternoon Regroup / Refocus', 2),
    ('day-7', 'evening', 'Day 7: Evening Meditation', '7-Day Elevated Reset — Day 7 Evening Meditation', 3)
) as l(module_slug, lesson_slug, lesson_title, video_title, sort_order)
join public.courses c on c.slug = '7-day-reset-meditation-series'
join public.modules mod on mod.course_id = c.id and mod.slug = l.module_slug
join public.videos vid on vid.title = l.video_title
on conflict (module_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Placeholder videos & lessons: Core Course Library (30 × 20–40 min)
-- ---------------------------------------------------------------------------

insert into public.videos (title, duration_seconds, status)
select
  format('Core Course Library — Lesson %s (placeholder)', lpad(gs::text, 2, '0')),
  1200 + ((gs - 1) % 3) * 600,
  'draft'
from generate_series(1, 30) as gs
where not exists (
  select 1
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where c.slug = 'core-course-library'
    and l.slug = 'lesson-' || lpad(gs::text, 2, '0')
);

insert into public.lessons (module_id, video_id, slug, title, sort_order, status)
select
  m.id,
  v.id,
  'lesson-' || lpad(gs::text, 2, '0'),
  format('Core Lesson %s', gs),
  gs,
  'published'
from generate_series(1, 30) as gs
cross join lateral (
  select mod.id
  from public.modules mod
  join public.courses c on c.id = mod.course_id
  where c.slug = 'core-course-library'
    and mod.slug = 'main'
  limit 1
) m
join lateral (
  select vid.id
  from public.videos vid
  where vid.title = format('Core Course Library — Lesson %s (placeholder)', lpad(gs::text, 2, '0'))
  limit 1
) v on true
on conflict (module_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Placeholder videos & lessons: Autoimmune Masterclass (5 × 60 min)
-- ---------------------------------------------------------------------------

insert into public.videos (title, duration_seconds, status)
select
  format('Autoimmune Masterclass — Lesson %s (placeholder)', lpad(gs::text, 2, '0')),
  3600,
  'draft'
from generate_series(1, 5) as gs
where not exists (
  select 1
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where c.slug = 'autoimmune-masterclass'
    and l.slug = 'lesson-' || lpad(gs::text, 2, '0')
);

insert into public.lessons (module_id, video_id, slug, title, sort_order, status)
select
  m.id,
  v.id,
  'lesson-' || lpad(gs::text, 2, '0'),
  format('Masterclass Session %s', gs),
  gs,
  'published'
from generate_series(1, 5) as gs
cross join lateral (
  select mod.id
  from public.modules mod
  join public.courses c on c.id = mod.course_id
  where c.slug = 'autoimmune-masterclass'
    and mod.slug = 'main'
  limit 1
) m
join lateral (
  select vid.id
  from public.videos vid
  where vid.title = format('Autoimmune Masterclass — Lesson %s (placeholder)', lpad(gs::text, 2, '0'))
  limit 1
) v on true
on conflict (module_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Placeholder videos & lessons: Health Professional Session (1 × 120 min)
-- ---------------------------------------------------------------------------

insert into public.videos (title, duration_seconds, status)
select
  'Health Professional Session — Full Recording (placeholder)',
  7200,
  'draft'
where not exists (
  select 1
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where c.slug = 'health-professional-session'
    and l.slug = 'session-01'
);

insert into public.lessons (module_id, video_id, slug, title, sort_order, status)
select
  m.id,
  v.id,
  'session-01',
  'Health Professional Session',
  1,
  'published'
from (
  select mod.id
  from public.modules mod
  join public.courses c on c.id = mod.course_id
  where c.slug = 'health-professional-session'
    and mod.slug = 'main'
  limit 1
) m
cross join (
  select vid.id
  from public.videos vid
  where vid.title = 'Health Professional Session — Full Recording (placeholder)'
  limit 1
) v
on conflict (module_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Placeholder videos & lessons: Free Taster (1 lesson, public preview)
-- ---------------------------------------------------------------------------

insert into public.videos (title, duration_seconds, status)
select
  'Free Taster — Sample Session (placeholder)',
  600,
  'draft'
where not exists (
  select 1
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where c.slug = 'free-taster'
    and l.slug = 'taster-01'
);

insert into public.lessons (module_id, video_id, slug, title, sort_order, status)
select
  m.id,
  v.id,
  'taster-01',
  'Free Taster Session',
  1,
  'published'
from (
  select mod.id
  from public.modules mod
  join public.courses c on c.id = mod.course_id
  where c.slug = 'free-taster'
    and mod.slug = 'main'
  limit 1
) m
cross join (
  select vid.id
  from public.videos vid
  where vid.title = 'Free Taster — Sample Session (placeholder)'
  limit 1
) v
on conflict (module_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Placeholder videos & lessons: Plan 2 virtual live session library
-- ---------------------------------------------------------------------------

insert into public.videos (title, duration_seconds, status)
select
  'Virtual Live Session Library — Placeholder Recording',
  3600,
  'draft'
where not exists (
  select 1
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where c.slug = 'virtual-live-session-library'
    and l.slug = 'library-placeholder'
);

insert into public.lessons (module_id, video_id, slug, title, sort_order, status)
select
  m.id,
  v.id,
  'library-placeholder',
  'Virtual Live Session (placeholder)',
  1,
  'published'
from (
  select mod.id
  from public.modules mod
  join public.courses c on c.id = mod.course_id
  where c.slug = 'virtual-live-session-library'
    and mod.slug = 'main'
  limit 1
) m
cross join (
  select vid.id
  from public.videos vid
  where vid.title = 'Virtual Live Session Library — Placeholder Recording'
  limit 1
) v
on conflict (module_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Placeholder videos & lessons: Plan 3 in-person & monthly extras
-- ---------------------------------------------------------------------------

insert into public.videos (title, duration_seconds, status)
select
  'In-Person & Monthly Extras — Placeholder Recording',
  3600,
  'draft'
where not exists (
  select 1
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where c.slug = 'in-person-monthly-extras'
    and l.slug = 'extras-placeholder'
);

insert into public.lessons (module_id, video_id, slug, title, sort_order, status)
select
  m.id,
  v.id,
  'extras-placeholder',
  'In-Person / Monthly Extra (placeholder)',
  1,
  'published'
from (
  select mod.id
  from public.modules mod
  join public.courses c on c.id = mod.course_id
  where c.slug = 'in-person-monthly-extras'
    and mod.slug = 'main'
  limit 1
) m
cross join (
  select vid.id
  from public.videos vid
  where vid.title = 'In-Person & Monthly Extras — Placeholder Recording'
  limit 1
) v
on conflict (module_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

insert into public.products (
  slug,
  title,
  description,
  product_type,
  price_amount,
  currency,
  stripe_price_id,
  status
)
values
  (
    '7-day-reset',
    '7-Day Reset',
    'Holistic wellness grocery list, manifestation breathwork, stress and inflammation quiz, and community access.',
    'masterclass',
    4700,
    'usd',
    'price_placeholder_7_day_reset',
    'published'
  ),
  (
    'autoimmune-masterclass',
    'Autoimmune Masterclass',
    'Five recorded sessions with workbook support and a completion certificate.',
    'masterclass',
    4700,
    'usd',
    'price_placeholder_autoimmune_masterclass',
    'published'
  ),
  (
    'health-professional-session',
    'Health Professional Session',
    'A two-hour recorded session for health professionals.',
    'session',
    6500,
    'usd',
    'price_placeholder_health_professional_session',
    'published'
  ),
  (
    'standalone-live-session',
    'Standalone Live Session',
    'A one-off virtual live session (25–30 participants max).',
    'session',
    5500,
    'usd',
    'price_placeholder_standalone_live_session',
    'published'
  ),
  (
    'ebook-1',
    'Ebook 1',
    'Digital ebook download.',
    'ebook',
    2499,
    'usd',
    'price_placeholder_ebook_1',
    'published'
  ),
  (
    'ebook-2',
    'Ebook 2',
    'Second digital ebook — price to be confirmed.',
    'ebook',
    0,
    'usd',
    null,
    'draft'
  ),
  (
    'vip-package',
    'VIP Package',
    'Custom high-touch transformation program. Apply to enquire — pricing is customized.',
    'bundle',
    0,
    'usd',
    null,
    'published'
  ),
  (
    'retreats-private-events',
    'Retreats & Private Events',
    'Weekend retreats and private events. Enquire for upcoming dates and pricing.',
    'bundle',
    0,
    'usd',
    null,
    'published'
  )
on conflict (slug) do nothing;

update public.products as p
set granted_course_id = c.id
from public.courses as c
where p.slug = '7-day-reset'
  and c.slug = '7-day-reset-meditation-series';

-- ---------------------------------------------------------------------------
-- Content access (plan → course)
-- ---------------------------------------------------------------------------

-- Plan 1: 7-Day Reset + Core Course Library
insert into public.content_access (plan_id, content_type, content_id)
select p.id, 'course', c.id
from public.plans p
cross join public.courses c
where p.slug = 'plan-1'
  and c.slug in ('7-day-reset-meditation-series', 'core-course-library')
on conflict (plan_id, content_type, content_id) do nothing;

-- Plan 2: Plan 1 content + virtual live session library
insert into public.content_access (plan_id, content_type, content_id)
select p.id, 'course', c.id
from public.plans p
cross join public.courses c
where p.slug = 'plan-2'
  and c.slug in (
    '7-day-reset-meditation-series',
    'core-course-library',
    'virtual-live-session-library'
  )
on conflict (plan_id, content_type, content_id) do nothing;

-- Plan 3: Plan 2 content + in-person / monthly extras
insert into public.content_access (plan_id, content_type, content_id)
select p.id, 'course', c.id
from public.plans p
cross join public.courses c
where p.slug = 'plan-3'
  and c.slug in (
    '7-day-reset-meditation-series',
    'core-course-library',
    'virtual-live-session-library',
    'in-person-monthly-extras'
  )
on conflict (plan_id, content_type, content_id) do nothing;
