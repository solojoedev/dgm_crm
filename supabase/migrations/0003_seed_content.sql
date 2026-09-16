-- Seed realistic content_items for the demo client so Overview/Calendar have
-- real rows to query instead of hardcoded arrays. Dates are relative to
-- now() so "this week" queries stay meaningful whenever this runs.
do $$
declare
  v_client_id uuid;
  v_user_id uuid;
begin
  select id into v_client_id from public.clients where name = 'Salt & Iron BBQ' limit 1;
  select id into v_user_id from auth.users order by created_at asc limit 1;

  if v_client_id is not null and not exists (select 1 from public.content_items where client_id = v_client_id) then
    insert into public.content_items (client_id, platform, caption, status, scheduled_at, created_by)
    values
      (v_client_id, 'ig_feed', 'Behind the pit: brisket prep', 'scheduled', now() - interval '2 days', v_user_id),
      (v_client_id, 'ig_feed', 'Brisket plate close-up', 'pending_approval', now() + interval '1 days', v_user_id),
      (v_client_id, 'ig_story', 'Weekend hours reminder', 'approved', now() + interval '2 days', v_user_id),
      (v_client_id, 'ig_reel', 'Sauce bottling day, reel', 'scheduled', now() + interval '3 days', v_user_id),
      (v_client_id, 'ig_story', 'Live music Saturday flyer', 'changes_requested', now() + interval '4 days', v_user_id);
  end if;
end $$;
