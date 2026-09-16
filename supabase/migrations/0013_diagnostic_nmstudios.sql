do $$
begin
  raise notice 'agencies: %', (select string_agg(name, ', ') from public.agencies);
  raise notice 'agency_members linked: %', (
    select string_agg(u.email || ' -> ' || a.name, ' | ')
    from public.agency_members am
    join auth.users u on u.id = am.user_id
    join public.agencies a on a.id = am.agency_id
  );
  raise notice 'clients: %', (select string_agg(name, ', ') from public.clients);
end $$;
