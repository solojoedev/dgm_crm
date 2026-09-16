do $$
declare
  v_client_id uuid;
  v_user_id uuid;
begin
  select id into v_client_id from public.clients where name = 'Solojoe Inc' limit 1;
  select id into v_user_id from auth.users where email = 'solojoemedia@gmail.com' limit 1;

  if v_client_id is not null and v_user_id is not null then
    insert into public.client_members (client_id, user_id, role)
    values (v_client_id, v_user_id, 'admin')
    on conflict do nothing;
    raise notice 'linked solojoemedia@gmail.com to Solojoe Inc';
  else
    raise notice 'missing client_id=% or user_id=%', v_client_id, v_user_id;
  end if;
end $$;
