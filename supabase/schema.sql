-- Non-destructive: independent v6 backend, leaves earlier tables untouched.
create table if not exists public.academy_state (
 id integer primary key check(id=1), revision bigint not null default 0,
 data jsonb not null, updated_at timestamptz not null default now()
);
alter table public.academy_state enable row level security;
revoke all on public.academy_state from anon, authenticated;
grant all on public.academy_state to service_role;
insert into public.academy_state(id,data) values(1,'{"users":[],"courses":[],"lessons":[],"enrollments":[],"payments":[],"expenses":[],"attempts":[],"submissions":[],"certificates":[],"tickets":[],"progress":{},"testSessions":{}}') on conflict(id) do nothing;
create table if not exists public.academy_audit (
 id bigint generated always as identity primary key, actor uuid not null,
 action text not null, revision bigint not null, created_at timestamptz not null default now()
);
alter table public.academy_audit enable row level security;
revoke all on public.academy_audit from anon, authenticated;
grant all on public.academy_audit to service_role;
create or replace function public.academy_commit(expected bigint, document jsonb, actor uuid, operation text)
returns bigint language plpgsql security definer set search_path='' as $$
declare result bigint;
begin
 update public.academy_state set data=document,revision=revision+1,updated_at=now()
 where id=1 and revision=expected returning revision into result;
 if result is null then raise exception 'CONFLICT: refresh and retry'; end if;
 insert into public.academy_audit(actor,action,revision) values(actor,operation,result);
 return result;
end $$;
revoke all on function public.academy_commit(bigint,jsonb,uuid,text) from public,anon,authenticated;
grant execute on function public.academy_commit(bigint,jsonb,uuid,text) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('academy-media','academy-media',false,209715200,array['video/mp4','video/webm','application/pdf','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
-- No browser storage policies: short-lived URLs issued by authenticated Edge Function.

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('academy-student-media','academy-student-media',false,20971520,array['application/pdf','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
