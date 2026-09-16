-- The original schema only let agency members *read* clients; nothing
-- allowed creating one, so "add a client" would have silently failed RLS.
create policy "agency members create clients" on clients for insert
  with check (exists (select 1 from agency_members am where am.agency_id = clients.agency_id and am.user_id = auth.uid()));
