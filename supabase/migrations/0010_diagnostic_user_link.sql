do $$
begin
  raise notice 'all auth.users emails: %', (select string_agg(email || ' (' || id || ')', ' | ') from auth.users);
  raise notice 'agency_members linked user: %', (
    select u.email || ' (' || u.id || ')'
    from public.agency_members am
    join auth.users u on u.id = am.user_id
    limit 1
  );
end $$;
