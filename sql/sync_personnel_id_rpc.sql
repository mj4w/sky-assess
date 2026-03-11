-- Sync student_id / instructor_id across all public tables.
-- Run this in Supabase SQL Editor.

create or replace function public.sync_personnel_id(
  new_personnel_id text,
  expected_role text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  resolved_role text := '';
  role_from_profile text := '';
  old_personnel_id text := '';
  id_column text := '';
  normalized_new_id text := lower(trim(coalesce(new_personnel_id, '')));
  candidate_role text := lower(trim(coalesce(expected_role, '')));
  table_row record;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select lower(coalesce(role::text, ''))
  into role_from_profile
  from public.profiles
  where id = current_user_id;

  if role_from_profile = 'instructor' then
    select lower(trim(coalesce(instructor_id, '')))
    into old_personnel_id
    from public.profiles
    where id = current_user_id;
  elsif role_from_profile = 'student' then
    select lower(trim(coalesce(student_id, '')))
    into old_personnel_id
    from public.profiles
    where id = current_user_id;
  end if;

  if candidate_role in ('student', 'instructor') then
    resolved_role := candidate_role;
  else
    resolved_role := role_from_profile;
  end if;

  if resolved_role not in ('student', 'instructor') then
    if exists (
      select 1
      from public.profiles p
      where p.id = current_user_id
        and coalesce(p.instructor_id, '') <> ''
    ) then
      resolved_role := 'instructor';
      select lower(trim(coalesce(instructor_id, '')))
      into old_personnel_id
      from public.profiles
      where id = current_user_id;
    elsif exists (
      select 1
      from public.profiles p
      where p.id = current_user_id
        and coalesce(p.student_id, '') <> ''
    ) then
      resolved_role := 'student';
      select lower(trim(coalesce(student_id, '')))
      into old_personnel_id
      from public.profiles
      where id = current_user_id;
    else
      raise exception 'Only student or instructor can update personnel ID';
    end if;
  end if;

  if normalized_new_id = '' then
    raise exception 'Official ID is required';
  end if;

  if normalized_new_id !~ '^[a-z0-9_-]+$' then
    raise exception 'Use lowercase letters, numbers, underscore, or dash only';
  end if;

  if resolved_role = 'instructor' then
    id_column := 'instructor_id';
    if exists (
      select 1
      from public.profiles p
      where p.id <> current_user_id
        and lower(coalesce(p.instructor_id, '')) = normalized_new_id
    ) then
      raise exception 'ID already exists';
    end if;
  else
    id_column := 'student_id';
    if exists (
      select 1
      from public.profiles p
      where p.id <> current_user_id
        and lower(coalesce(p.student_id, '')) = normalized_new_id
    ) then
      raise exception 'ID already exists';
    end if;
  end if;

  for table_row in
    select c.table_schema, c.table_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.column_name = id_column
      and c.table_name <> 'profiles'
  loop
    execute format(
      'update %I.%I set %I = $1 where lower(coalesce(%I, '''')) = lower($2)',
      table_row.table_schema,
      table_row.table_name,
      id_column,
      id_column
    )
    using normalized_new_id, old_personnel_id;
  end loop;

  if resolved_role = 'instructor' then
    update public.profiles
    set instructor_id = normalized_new_id,
        login_first_time = true
    where id = current_user_id;
  else
    update public.profiles
    set student_id = normalized_new_id,
        login_first_time = true
    where id = current_user_id;
  end if;

  return jsonb_build_object(
    'ok', true,
    'role', resolved_role,
    'old_id', old_personnel_id,
    'new_id', normalized_new_id
  );
end;
$$;

grant execute on function public.sync_personnel_id(text, text) to authenticated;
