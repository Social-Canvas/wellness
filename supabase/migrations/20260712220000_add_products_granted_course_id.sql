alter table public.products
add column if not exists granted_course_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_granted_course_id_fkey'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_granted_course_id_fkey
      foreign key (granted_course_id)
      references public.courses (id)
      on delete set null;
  end if;
end
$$;

create index if not exists products_granted_course_id_idx
  on public.products (granted_course_id);
