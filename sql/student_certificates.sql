create table if not exists public.student_certificates (
    id uuid primary key default gen_random_uuid(),
    student_id text not null,
    course_code text not null,
    certificate_name text,
    certificate_no text,
    status text not null default 'issued',
    issued_at date,
    remarks text,
    file_path text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    created_by uuid references auth.users(id)
);

create index if not exists idx_student_certificates_student_id
    on public.student_certificates (lower(student_id));

create index if not exists idx_student_certificates_course_code
    on public.student_certificates (upper(course_code));

alter table public.student_certificates enable row level security;

drop policy if exists "Students can view own certificates" on public.student_certificates;
create policy "Students can view own certificates"
on public.student_certificates
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and lower(coalesce(profiles.student_id, '')) = lower(student_certificates.student_id)
    )
);

drop policy if exists "Instructors can view student certificates" on public.student_certificates;
create policy "Instructors can view student certificates"
on public.student_certificates
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'instructor'
    )
);

drop policy if exists "Admins can manage student certificates" on public.student_certificates;
create policy "Admins can manage student certificates"
on public.student_certificates
for all
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);

create or replace function public.set_student_certificates_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_student_certificates_updated_at on public.student_certificates;
create trigger trg_student_certificates_updated_at
before update on public.student_certificates
for each row
execute function public.set_student_certificates_updated_at();
