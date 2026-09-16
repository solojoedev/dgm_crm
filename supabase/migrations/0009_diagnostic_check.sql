-- Read-only diagnostic: surfaces counts via NOTICE in `supabase db push`
-- output. Makes no schema or data changes.
do $$
declare
  client_count int;
  agency_count int;
  bucket_info text;
  storage_count int;
  policy_count int;
begin
  select count(*) into client_count from public.clients;
  raise notice 'clients count: %', client_count;

  select count(*) into agency_count from public.agency_members;
  raise notice 'agency_members count: %', agency_count;

  select row_to_json(b)::text into bucket_info from storage.buckets b where id = 'files';
  raise notice 'files bucket: %', coalesce(bucket_info, 'NOT FOUND');

  select count(*) into storage_count from storage.objects where bucket_id = 'files';
  raise notice 'files bucket object count: %', storage_count;

  select count(*) into policy_count from pg_policies where tablename = 'objects' and schemaname = 'storage';
  raise notice 'storage.objects policy count: %', policy_count;
end $$;
