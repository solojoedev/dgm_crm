-- "agency members read their roster" subqueried agency_members from
-- within its own policy, which re-triggers agency_members' RLS on itself
-- recursively. Postgres can't resolve that, so the query fails silently
-- — and since "clients" and "agencies" also read agency_members as a
-- plain subquery, they were failing the same way for real logged-in
-- sessions (direct DB/CLI access bypasses RLS entirely, which is why
-- earlier diagnostics looked fine). Route it through a security-definer
-- helper instead, which bypasses nested RLS and breaks the recursion.
create or replace function is_agency_member(target_agency_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from agency_members am
    where am.agency_id = target_agency_id and am.user_id = auth.uid()
  );
$$;

drop policy if exists "agency members read their roster" on agency_members;
create policy "agency members read their roster" on agency_members for select
  using (is_agency_member(agency_id));

drop policy if exists "agency members read their agency" on agencies;
create policy "agency members read their agency" on agencies for select
  using (is_agency_member(agencies.id));

drop policy if exists "scoped read: clients" on clients;
create policy "scoped read: clients" on clients for select
  using (
    is_agency_member(clients.agency_id)
    or is_client_member(clients.id)
  );
