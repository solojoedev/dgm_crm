-- Auto-create a profiles row whenever a new auth user signs up (created
-- manually via the dashboard or later via an invite flow).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any auth users created before this trigger existed
-- (e.g. the test login created manually via the dashboard).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;

-- Seed one demo agency + client, and make the existing test user its owner,
-- so there's real data to query instead of hardcoded arrays.
do $$
declare
  v_agency_id uuid;
  v_user_id uuid;
begin
  select id into v_user_id from auth.users order by created_at asc limit 1;

  if v_user_id is not null and not exists (select 1 from public.agencies) then
    insert into public.agencies (name)
    values ('Demo Agency')
    returning id into v_agency_id;

    insert into public.agency_members (agency_id, user_id, role)
    values (v_agency_id, v_user_id, 'owner')
    on conflict do nothing;

    insert into public.clients (agency_id, name, scope_color)
    values (v_agency_id, 'Salt & Iron BBQ', '#B0552E');
  end if;
end $$;
