-- Shared debrief tables for PPL, CPL, IR, and ME courses
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.course_debriefs (
  id uuid primary key default gen_random_uuid(),
  course_code text not null check (course_code in ('PPL', 'CPL', 'IR', 'ME')),
  assignment_id uuid references public.flight_ops_assignments(id) on delete set null,
  student_id text not null,
  student_name_snapshot text,
  instructor_id text not null,
  instructor_name_snapshot text,
  lesson_no text not null,
  op_date date not null,
  rpc text not null,
  duration text not null,
  flight_type text,
  time_label text,
  instructor_signature_path text not null,
  student_signature_path text,
  notify boolean not null default false,
  instructor_signed_at timestamptz not null default now(),
  student_signed_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_course_debriefs_course_code on public.course_debriefs(course_code);
create index if not exists idx_course_debriefs_student_id on public.course_debriefs(student_id);
create index if not exists idx_course_debriefs_instructor_id on public.course_debriefs(instructor_id);
create index if not exists idx_course_debriefs_op_date on public.course_debriefs(op_date);
create index if not exists idx_course_debriefs_assignment_id on public.course_debriefs(assignment_id);

create table if not exists public.course_debrief_items (
  id uuid primary key default gen_random_uuid(),
  debrief_id uuid not null references public.course_debriefs(id) on delete cascade,
  section_title text not null,
  item_name text not null,
  grade text check (grade in ('S+', 'S', 'S-', 'NP')),
  remark text,
  created_at timestamptz not null default now(),
  unique (debrief_id, item_name)
);

create index if not exists idx_course_debrief_items_debrief_id on public.course_debrief_items(debrief_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_course_debriefs_set_updated_at on public.course_debriefs;
create trigger trg_course_debriefs_set_updated_at
before update on public.course_debriefs
for each row
execute function public.set_updated_at();

alter table public.course_debriefs enable row level security;
alter table public.course_debrief_items enable row level security;

drop policy if exists "course_debriefs_select_policy" on public.course_debriefs;
create policy "course_debriefs_select_policy"
on public.course_debriefs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('admin', 'flightops')
        or (p.role = 'instructor' and lower(coalesce(p.instructor_id, '')) = lower(course_debriefs.instructor_id))
        or (p.role = 'student' and lower(coalesce(p.student_id, '')) = lower(course_debriefs.student_id))
      )
  )
);

drop policy if exists "course_debriefs_insert_policy" on public.course_debriefs;
create policy "course_debriefs_insert_policy"
on public.course_debriefs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'instructor'
      and lower(coalesce(p.instructor_id, '')) = lower(course_debriefs.instructor_id)
  )
);

drop policy if exists "course_debriefs_update_policy" on public.course_debriefs;
create policy "course_debriefs_update_policy"
on public.course_debriefs
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        (p.role = 'instructor' and lower(coalesce(p.instructor_id, '')) = lower(course_debriefs.instructor_id))
        or (p.role = 'student' and lower(coalesce(p.student_id, '')) = lower(course_debriefs.student_id))
      )
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        (p.role = 'instructor' and lower(coalesce(p.instructor_id, '')) = lower(course_debriefs.instructor_id))
        or (p.role = 'student' and lower(coalesce(p.student_id, '')) = lower(course_debriefs.student_id))
      )
  )
);

drop policy if exists "course_debrief_items_select_policy" on public.course_debrief_items;
create policy "course_debrief_items_select_policy"
on public.course_debrief_items
for select
to authenticated
using (
  exists (
    select 1
    from public.course_debriefs d
    join public.profiles p on p.id = auth.uid()
    where d.id = course_debrief_items.debrief_id
      and (
        p.role in ('admin', 'flightops')
        or (p.role = 'instructor' and lower(coalesce(p.instructor_id, '')) = lower(d.instructor_id))
        or (p.role = 'student' and lower(coalesce(p.student_id, '')) = lower(d.student_id))
      )
  )
);

drop policy if exists "course_debrief_items_insert_policy" on public.course_debrief_items;
create policy "course_debrief_items_insert_policy"
on public.course_debrief_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.course_debriefs d
    join public.profiles p on p.id = auth.uid()
    where d.id = course_debrief_items.debrief_id
      and p.role = 'instructor'
      and lower(coalesce(p.instructor_id, '')) = lower(d.instructor_id)
  )
);
