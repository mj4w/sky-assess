-- PPL Debrief Tables (with instructor signature support)
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.ppl_debriefs (
  id uuid primary key default gen_random_uuid(),
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
  notify boolean not null default false,
  instructor_signed_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ppl_debriefs_student_id on public.ppl_debriefs(student_id);
create index if not exists idx_ppl_debriefs_instructor_id on public.ppl_debriefs(instructor_id);
create index if not exists idx_ppl_debriefs_op_date on public.ppl_debriefs(op_date);
create index if not exists idx_ppl_debriefs_assignment_id on public.ppl_debriefs(assignment_id);

create table if not exists public.ppl_debrief_items (
  id uuid primary key default gen_random_uuid(),
  debrief_id uuid not null references public.ppl_debriefs(id) on delete cascade,
  section_title text not null,
  item_name text not null,
  grade text check (grade in ('S+', 'S', 'S-', 'NP')),
  remark text,
  created_at timestamptz not null default now(),
  unique (debrief_id, item_name)
);

create index if not exists idx_ppl_debrief_items_debrief_id on public.ppl_debrief_items(debrief_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_ppl_debriefs_set_updated_at on public.ppl_debriefs;
create trigger trg_ppl_debriefs_set_updated_at
before update on public.ppl_debriefs
for each row
execute function public.set_updated_at();

-- Enable RLS
alter table public.ppl_debriefs enable row level security;
alter table public.ppl_debrief_items enable row level security;

-- READ: instructor owner, student owner, admin, flightops
drop policy if exists "ppl_debriefs_select_policy" on public.ppl_debriefs;
create policy "ppl_debriefs_select_policy"
on public.ppl_debriefs
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role in ('admin', 'flightops')
        or (p.role = 'instructor' and lower(coalesce(p.instructor_id, '')) = lower(ppl_debriefs.instructor_id))
        or (p.role = 'student' and lower(coalesce(p.student_id, '')) = lower(ppl_debriefs.student_id))
      )
  )
);

-- INSERT: instructor can submit only for own instructor_id
drop policy if exists "ppl_debriefs_insert_policy" on public.ppl_debriefs;
create policy "ppl_debriefs_insert_policy"
on public.ppl_debriefs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'instructor'
      and lower(coalesce(p.instructor_id, '')) = lower(ppl_debriefs.instructor_id)
  )
);

-- UPDATE: instructor owner (optional edits)
drop policy if exists "ppl_debriefs_update_policy" on public.ppl_debriefs;
create policy "ppl_debriefs_update_policy"
on public.ppl_debriefs
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'instructor'
      and lower(coalesce(p.instructor_id, '')) = lower(ppl_debriefs.instructor_id)
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'instructor'
      and lower(coalesce(p.instructor_id, '')) = lower(ppl_debriefs.instructor_id)
  )
);

-- UPDATE (student acknowledgment/signature): student owner
drop policy if exists "ppl_debriefs_student_update_policy" on public.ppl_debriefs;
create policy "ppl_debriefs_student_update_policy"
on public.ppl_debriefs
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
      and lower(coalesce(p.student_id, '')) = lower(ppl_debriefs.student_id)
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
      and lower(coalesce(p.student_id, '')) = lower(ppl_debriefs.student_id)
  )
);

-- Child table policies via parent ownership
drop policy if exists "ppl_debrief_items_select_policy" on public.ppl_debrief_items;
create policy "ppl_debrief_items_select_policy"
on public.ppl_debrief_items
for select
to authenticated
using (
  exists (
    select 1
    from public.ppl_debriefs d
    join public.profiles p on p.id = auth.uid()
    where d.id = ppl_debrief_items.debrief_id
      and (
        p.role in ('admin', 'flightops')
        or (p.role = 'instructor' and lower(coalesce(p.instructor_id, '')) = lower(d.instructor_id))
        or (p.role = 'student' and lower(coalesce(p.student_id, '')) = lower(d.student_id))
      )
  )
);

drop policy if exists "ppl_debrief_items_insert_policy" on public.ppl_debrief_items;
create policy "ppl_debrief_items_insert_policy"
on public.ppl_debrief_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ppl_debriefs d
    join public.profiles p on p.id = auth.uid()
    where d.id = ppl_debrief_items.debrief_id
      and p.role = 'instructor'
      and lower(coalesce(p.instructor_id, '')) = lower(d.instructor_id)
  )
);

-- Signature storage bucket
insert into storage.buckets (id, name, public)
values ('debrief-signatures', 'debrief-signatures', false)
on conflict (id) do nothing;

-- Storage policies (authenticated users can upload/read only within their own folder prefix: "<auth.uid()>/...")
drop policy if exists "debrief_signatures_upload_own" on storage.objects;
create policy "debrief_signatures_upload_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'debrief-signatures'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "debrief_signatures_read_owner_or_related" on storage.objects;
create policy "debrief_signatures_read_owner_or_related"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'debrief-signatures'
);
