do $$
begin
  raise notice 'tables in supabase_realtime publication: %', (
    select string_agg(schemaname || '.' || tablename, ', ')
    from pg_publication_tables
    where pubname = 'supabase_realtime'
  );
end $$;
