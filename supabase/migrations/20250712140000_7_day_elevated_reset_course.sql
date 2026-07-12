-- Restructure The 7-Day Elevated Reset course (slug: 7-day-reset-meditation-series)
-- Welcome + 7 days × (Morning / Afternoon / Evening) = 22 lessons
-- Videos created as draft placeholders pending Mux migration.

begin;

update public.courses
set
  title = 'The 7-Day Elevated Reset',
  description =
    'A guided seven-day nervous system reset — welcome orientation plus daily morning meditations, afternoon regroup sessions, and evening meditations.',
  status = 'draft'::public.publish_status,
  updated_at = now()
where slug = '7-day-reset-meditation-series';

-- Remove legacy single-module placeholder structure (lessons cascade).
delete from public.modules
where course_id = (
  select id from public.courses where slug = '7-day-reset-meditation-series'
);

-- Remove orphaned placeholder videos from the prior seed pattern.
delete from public.videos
where title like '7-Day Reset — Lesson%';

-- Course progress will be recalculated when members resume lessons.
delete from public.course_progress
where course_id = (
  select id from public.courses where slug = '7-day-reset-meditation-series'
);

create temp table reset_lesson_defs (
  module_slug text not null,
  module_title text not null,
  module_sort_order integer not null,
  lesson_slug text not null,
  lesson_title text not null,
  video_title text not null,
  lesson_sort_order integer not null
);

insert into reset_lesson_defs (
  module_slug,
  module_title,
  module_sort_order,
  lesson_slug,
  lesson_title,
  video_title,
  lesson_sort_order
)
values
  ('welcome', 'Welcome', 0, 'welcome', 'Welcome', '7-Day Elevated Reset — Welcome', 1),
  ('day-1', 'Day 1', 1, 'morning', 'Morning Meditation', '7-Day Elevated Reset — Day 1 Morning Meditation', 1),
  ('day-1', 'Day 1', 1, 'afternoon', 'Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 1 Afternoon Regroup / Refocus', 2),
  ('day-1', 'Day 1', 1, 'evening', 'Evening Meditation', '7-Day Elevated Reset — Day 1 Evening Meditation', 3),
  ('day-2', 'Day 2', 2, 'morning', 'Morning Meditation', '7-Day Elevated Reset — Day 2 Morning Meditation', 1),
  ('day-2', 'Day 2', 2, 'afternoon', 'Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 2 Afternoon Regroup / Refocus', 2),
  ('day-2', 'Day 2', 2, 'evening', 'Evening Meditation', '7-Day Elevated Reset — Day 2 Evening Meditation', 3),
  ('day-3', 'Day 3', 3, 'morning', 'Morning Meditation', '7-Day Elevated Reset — Day 3 Morning Meditation', 1),
  ('day-3', 'Day 3', 3, 'afternoon', 'Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 3 Afternoon Regroup / Refocus', 2),
  ('day-3', 'Day 3', 3, 'evening', 'Evening Meditation', '7-Day Elevated Reset — Day 3 Evening Meditation', 3),
  ('day-4', 'Day 4', 4, 'morning', 'Morning Meditation', '7-Day Elevated Reset — Day 4 Morning Meditation', 1),
  ('day-4', 'Day 4', 4, 'afternoon', 'Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 4 Afternoon Regroup / Refocus', 2),
  ('day-4', 'Day 4', 4, 'evening', 'Evening Meditation', '7-Day Elevated Reset — Day 4 Evening Meditation', 3),
  ('day-5', 'Day 5', 5, 'morning', 'Morning Meditation', '7-Day Elevated Reset — Day 5 Morning Meditation', 1),
  ('day-5', 'Day 5', 5, 'afternoon', 'Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 5 Afternoon Regroup / Refocus', 2),
  ('day-5', 'Day 5', 5, 'evening', 'Evening Meditation', '7-Day Elevated Reset — Day 5 Evening Meditation', 3),
  ('day-6', 'Day 6', 6, 'morning', 'Morning Meditation', '7-Day Elevated Reset — Day 6 Morning Meditation', 1),
  ('day-6', 'Day 6', 6, 'afternoon', 'Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 6 Afternoon Regroup / Refocus', 2),
  ('day-6', 'Day 6', 6, 'evening', 'Evening Meditation', '7-Day Elevated Reset — Day 6 Evening Meditation', 3),
  ('day-7', 'Day 7', 7, 'morning', 'Morning Meditation', '7-Day Elevated Reset — Day 7 Morning Meditation', 1),
  ('day-7', 'Day 7', 7, 'afternoon', 'Afternoon Regroup / Refocus', '7-Day Elevated Reset — Day 7 Afternoon Regroup / Refocus', 2),
  ('day-7', 'Day 7', 7, 'evening', 'Evening Meditation', '7-Day Elevated Reset — Day 7 Evening Meditation', 3);

insert into public.modules (course_id, slug, title, description, status, sort_order)
select distinct
  c.id,
  d.module_slug,
  d.module_title,
  case
    when d.module_slug = 'welcome' then 'Start here before Day 1.'
    else format('Morning, afternoon, and evening sessions for %s.', d.module_title)
  end,
  'draft'::public.publish_status,
  d.module_sort_order
from reset_lesson_defs d
cross join public.courses c
where c.slug = '7-day-reset-meditation-series'
on conflict (course_id, slug) do update
set
  title = excluded.title,
  description = excluded.description,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.videos (title, status, migration_status)
select distinct
  d.video_title,
  'draft'::public.video_status,
  'not_started'::public.migration_status
from reset_lesson_defs d
where not exists (
  select 1 from public.videos v where v.title = d.video_title
);

insert into public.lessons (
  module_id,
  video_id,
  slug,
  title,
  sort_order,
  is_required,
  status
)
select
  m.id,
  v.id,
  d.lesson_slug,
  case
    when d.module_slug = 'welcome' then d.lesson_title
    else format('%s: %s', d.module_title, d.lesson_title)
  end,
  d.lesson_sort_order,
  true,
  'draft'::public.publish_status
from reset_lesson_defs d
join public.courses c on c.slug = '7-day-reset-meditation-series'
join public.modules m on m.course_id = c.id and m.slug = d.module_slug
join public.videos v on v.title = d.video_title
on conflict (module_id, slug) do update
set
  video_id = excluded.video_id,
  title = excluded.title,
  sort_order = excluded.sort_order,
  is_required = excluded.is_required,
  updated_at = now();

drop table reset_lesson_defs;

commit;
