alter table public.proofs add column if not exists caption text;

do $$
declare
  v_client_id uuid;
  v_user_id uuid;
begin
  select id into v_client_id from public.clients where name = 'Salt & Iron BBQ' limit 1;
  select id into v_user_id from auth.users order by created_at asc limit 1;

  if v_client_id is not null and not exists (select 1 from public.proofs where client_id = v_client_id) then
    insert into public.proofs (client_id, storage_path, media_type, caption, liked, expires_at, created_by)
    values
      (v_client_id, 'demo/smoke-ring.jpg', 'image', 'Smoke ring shot', false, now() + interval '28 days', v_user_id),
      (v_client_id, 'demo/brisket-close-up.jpg', 'image', 'Brisket close-up, plated', true, now() + interval '25 days', v_user_id),
      (v_client_id, 'demo/pitmaster-marcus.jpg', 'image', 'Pitmaster Marcus tending fire', true, now() + interval '20 days', v_user_id),
      (v_client_id, 'demo/ribs-on-rack.jpg', 'image', 'Ribs on the rack', false, now() + interval '14 days', v_user_id),
      (v_client_id, 'demo/sauce-bottling.jpg', 'image', 'Sauce bottling line', true, now() + interval '9 days', v_user_id),
      (v_client_id, 'demo/dining-room.jpg', 'image', 'Dining room, wide shot', false, now() + interval '6 days', v_user_id),
      (v_client_id, 'demo/to-go-counter.jpg', 'image', 'To-go counter', false, now() + interval '3 days', v_user_id),
      (v_client_id, 'demo/staff-group.jpg', 'image', 'Staff group photo', false, now() + interval '1 days', v_user_id);
  end if;
end $$;
