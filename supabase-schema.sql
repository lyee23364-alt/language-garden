-- 在 Supabase SQL Editor 中执行一次。
create table if not exists public.learning_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"sessions":[],"reviews":[],"daily":{}}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.learning_progress enable row level security;

revoke all on table public.learning_progress from anon, authenticated;
grant select, insert, update on table public.learning_progress to authenticated;

create policy "users_read_own_progress"
on public.learning_progress for select
to authenticated
using (auth.uid() is not null and auth.uid() = user_id);

create policy "users_create_own_progress"
on public.learning_progress for insert
to authenticated
with check (auth.uid() is not null and auth.uid() = user_id);

create policy "users_update_own_progress"
on public.learning_progress for update
to authenticated
using (auth.uid() is not null and auth.uid() = user_id)
with check (auth.uid() is not null and auth.uid() = user_id);

