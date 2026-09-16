do $$
declare
  v_client_id uuid;
  v_user_id uuid;
begin
  select id into v_client_id from public.clients where name = 'Salt & Iron BBQ' limit 1;
  select id into v_user_id from auth.users order by created_at asc limit 1;

  if v_client_id is not null and not exists (select 1 from public.files where client_id = v_client_id) then
    insert into public.files (client_id, name, storage_path, status, uploaded_by)
    values
      (v_client_id, 'Brisket_plate_v2.jpg', 'demo/Brisket_plate_v2.jpg', 'approved', v_user_id),
      (v_client_id, 'Menu_flyer_draft.pdf', 'demo/Menu_flyer_draft.pdf', 'pending_review', v_user_id),
      (v_client_id, 'Logo_pack.zip', 'demo/Logo_pack.zip', 'shared', v_user_id);
  end if;

  if v_client_id is not null and not exists (select 1 from public.meetings where client_id = v_client_id) then
    insert into public.meetings (client_id, title, platform, join_url, scheduled_at, created_by)
    values
      (v_client_id, 'Content review: July flyer', 'zoom', 'https://zoom.us/j/8842991205', now() + interval '3 days', v_user_id),
      (v_client_id, 'Monthly strategy call', 'google_meet', 'https://meet.google.com/qkr-hzpf-vcd', now() + interval '10 days', v_user_id);
  end if;
end $$;
