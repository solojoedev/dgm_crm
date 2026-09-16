-- The "files" bucket was created with no access policies, so nothing could
-- read or write to it yet. Scoping storage access per-client the same way
-- the database RLS policies do would need the client_id encoded in the
-- object path and checked against agency_members/client_members; with only
-- one real login in the system so far, we open it to any authenticated
-- user for now and tighten it once real per-client logins exist.
create policy "authenticated read files bucket"
on storage.objects for select
to authenticated
using (bucket_id = 'files');

create policy "authenticated upload files bucket"
on storage.objects for insert
to authenticated
with check (bucket_id = 'files');

create policy "authenticated update files bucket"
on storage.objects for update
to authenticated
using (bucket_id = 'files');

create policy "authenticated delete files bucket"
on storage.objects for delete
to authenticated
using (bucket_id = 'files');
