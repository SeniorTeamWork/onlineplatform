-- Run once in this project's Supabase SQL Editor, before deploying academy.
begin;
create table if not exists public.academy_staff_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
alter table public.academy_staff_presence enable row level security;
revoke all on table public.academy_staff_presence from public, anon, authenticated;
grant select, insert, update on table public.academy_staff_presence to service_role;
comment on table public.academy_staff_presence is
  'Latest admin heartbeat. Access only through authenticated academy Edge Function.';
commit;
