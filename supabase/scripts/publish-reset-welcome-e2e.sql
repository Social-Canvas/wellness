-- Publish Welcome module/lesson ONLY after Mux asset is ready.
-- Run manually in Supabase SQL editor after verifying mux_playback_id is set.

begin;

update public.videos v
set status = 'published'::public.video_status, updated_at = now()
where v.title = '7-Day Elevated Reset — Welcome'
  and v.mux_playback_id is not null
  and v.status in ('ready', 'published');

update public.lessons l
set status = 'published'::public.publish_status, updated_at = now()
from public.modules m
join public.courses c on c.id = m.course_id
join public.videos v on v.id = l.video_id
where l.module_id = m.id
  and c.slug = '7-day-reset-meditation-series'
  and m.slug = 'welcome'
  and l.slug = 'welcome'
  and v.mux_playback_id is not null
  and v.status in ('ready', 'published');

update public.modules m
set status = 'published'::public.publish_status, updated_at = now()
from public.courses c
where m.course_id = c.id
  and c.slug = '7-day-reset-meditation-series'
  and m.slug = 'welcome'
  and exists (
    select 1
    from public.lessons l
    join public.videos v on v.id = l.video_id
    where l.module_id = m.id
      and l.slug = 'welcome'
      and v.mux_playback_id is not null
      and v.status in ('ready', 'published')
  );

-- Course remains draft until full media migration / launch decision.

commit;
