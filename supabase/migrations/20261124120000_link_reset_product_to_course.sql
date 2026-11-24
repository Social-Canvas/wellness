-- Link the published Reset product to the published Reset course.
-- Purchase and complimentary entitlements read products.granted_course_id.
-- Does not create orders, prices, or course content.

update public.products p
set granted_course_id = c.id,
    updated_at = now()
from public.courses c
where p.slug = '7-day-reset'
  and c.slug = '7-day-reset-meditation-series'
  and c.status = 'published'
  and p.granted_course_id is distinct from c.id;
