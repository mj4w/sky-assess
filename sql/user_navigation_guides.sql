create table if not exists public.user_navigation_guides (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    page_key text not null,
    completed boolean not null default false,
    status text not null default 'pending',
    completed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (user_id, page_key)
);

create index if not exists idx_user_navigation_guides_user_id
    on public.user_navigation_guides (user_id);

create index if not exists idx_user_navigation_guides_page_key
    on public.user_navigation_guides (page_key);

alter table public.user_navigation_guides enable row level security;

drop policy if exists "Users can view own navigation guides" on public.user_navigation_guides;
create policy "Users can view own navigation guides"
on public.user_navigation_guides
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own navigation guides" on public.user_navigation_guides;
create policy "Users can insert own navigation guides"
on public.user_navigation_guides
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own navigation guides" on public.user_navigation_guides;
create policy "Users can update own navigation guides"
on public.user_navigation_guides
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Admins can view all navigation guides" on public.user_navigation_guides;
create policy "Admins can view all navigation guides"
on public.user_navigation_guides
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);

create or replace function public.set_user_navigation_guides_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_user_navigation_guides_updated_at on public.user_navigation_guides;
create trigger trg_user_navigation_guides_updated_at
before update on public.user_navigation_guides
for each row
execute function public.set_user_navigation_guides_updated_at();
