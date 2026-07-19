// Scheduled daily (via a Supabase Cron Trigger pointed at this function).
// Deletes proofs that expired without being liked: removes the file from
// Storage first, then the row, so we never orphan a row with no file.
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async () => {
  const { data: expired, error } = await supabase
    .from("proofs")
    .select("id, storage_path")
    .eq("liked", false)
    .lt("expires_at", new Date().toISOString());

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return new Response(JSON.stringify({ deleted: 0 }));
  }

  const paths = expired.map((p) => p.storage_path);
  const { error: storageError } = await supabase.storage.from("proofs").remove(paths);
  if (storageError) {
    return new Response(JSON.stringify({ error: storageError.message }), { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from("proofs")
    .delete()
    .in("id", expired.map((p) => p.id));

  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ deleted: expired.length }));
});
