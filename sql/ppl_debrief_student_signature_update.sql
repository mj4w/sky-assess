-- Add student acknowledgment signature support for PPL debrief
-- Run in Supabase SQL Editor if these columns do not yet exist.

alter table public.ppl_debriefs
  add column if not exists student_signature_path text,
  add column if not exists student_signed_at timestamptz,
  add column if not exists notify boolean not null default false;

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
