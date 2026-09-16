do $$
declare
  v_agency_id uuid;
  v_user_id uuid;
begin
  update public.agencies set name = 'NM Studios' where name = 'Demo Agency'
    returning id into v_agency_id;

  if v_agency_id is null then
    select id into v_agency_id from public.agencies limit 1;
  end if;

  select id into v_user_id from auth.users where email = 'nichole@nmstudios.co' limit 1;

  if v_agency_id is not null and v_user_id is not null then
    insert into public.agency_members (agency_id, user_id, role)
    values (v_agency_id, v_user_id, 'owner')
    on conflict do nothing;
  end if;

  if v_agency_id is not null and not exists (select 1 from public.clients where agency_id = v_agency_id and name = 'Solojoe Inc') then
    insert into public.clients (agency_id, name)
    values (v_agency_id, 'Solojoe Inc');
  end if;
end $$;
