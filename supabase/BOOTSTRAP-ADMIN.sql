-- 1. Create your admin in Supabase Authentication > Users first.
-- 2. Replace ONLY the email below. Run after the migration.
do $$
declare account auth.users; doc jsonb;
begin
 select * into account from auth.users where email='YOUR_ADMIN_EMAIL';
 if account.id is null then raise exception 'Create Auth user and replace YOUR_ADMIN_EMAIL'; end if;
 select data into doc from public.academy_state where id=1 for update;
 if exists(select 1 from jsonb_array_elements(doc->'users') u where u->>'id'=account.id::text) then raise exception 'Already registered'; end if;
 doc=jsonb_set(doc,'{users}',(doc->'users')||jsonb_build_array(jsonb_build_object('id',account.id,'email',account.email,'name','Administrator','role','admin','active',true,'phone','','createdAt',now())));
 update public.academy_state set data=doc,revision=revision+1 where id=1;
end $$;
