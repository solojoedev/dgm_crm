import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";
import Overview from "@/components/Overview";
import Calendar from "@/components/Calendar";

type MessageRow = { id: string; body: string; created_at: string; sender_id: string | null };

async function signPaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
) {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const { data } = await supabase.storage.from("files").createSignedUrls(paths, 3600);
  (data ?? []).forEach((entry) => {
    if (entry.signedUrl && entry.path) map.set(entry.path, entry.signedUrl);
  });
  return map;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ client?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { client: clientParam } = await searchParams;

  const [{ data: clients }, { data: membership }] = await Promise.all([
    supabase.from("clients").select("id, name").order("created_at", { ascending: true }),
    supabase.from("agency_members").select("agency_id").eq("user_id", user.id).limit(1).maybeSingle(),
  ]);

  const clientList = clients ?? [];
  const selected = clientList.find((c) => c.id === clientParam) ?? clientList[0] ?? null;
  const clientId = selected?.id ?? null;
  const clientName = selected?.name ?? "your client";
  const agencyId = membership?.agency_id ?? null;

  const [{ data: proofs }, { data: approvalRows }, { data: meetings }, { data: files }, { data: messages }] = await Promise.all([
    clientId
      ? supabase.from("proofs").select("id, caption, expires_at, liked, storage_path").eq("client_id", clientId).order("expires_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    clientId
      ? supabase.from("content_items").select("id, caption, platform, status, note, clients(name)").eq("client_id", clientId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    clientId
      ? supabase.from("meetings").select("id, title, platform, join_url, scheduled_at").eq("client_id", clientId).order("scheduled_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    clientId
      ? supabase.from("files").select("id, name, status, created_at, storage_path").eq("client_id", clientId).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    clientId
      ? supabase.from("messages").select("id, body, created_at, sender_id").eq("client_id", clientId).order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const proofRows = (proofs ?? []) as { id: string; caption: string | null; expires_at: string; liked: boolean; storage_path: string }[];
  const fileRows = (files ?? []) as { id: string; name: string; status: string; created_at: string; storage_path: string }[];

  const [proofUrlMap, fileUrlMap] = await Promise.all([
    signPaths(supabase, proofRows.map((p) => p.storage_path)),
    signPaths(supabase, fileRows.map((f) => f.storage_path)),
  ]);

  const signedProofs = proofRows.map((p) => ({
    id: p.id,
    caption: p.caption,
    expires_at: p.expires_at,
    liked: p.liked,
    imageUrl: proofUrlMap.get(p.storage_path) ?? null,
  }));

  const signedFiles = fileRows.map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
    created_at: f.created_at,
    url: fileUrlMap.get(f.storage_path) ?? null,
  }));

  const approvals = (approvalRows ?? []).map((row) => ({
    id: row.id,
    caption: row.caption,
    platform: row.platform,
    status: row.status,
    note: row.note,
    clientName: (row.clients as unknown as { name: string } | null)?.name ?? "Client",
  }));

  return (
    <Dashboard
      overview={<Overview />}
      calendar={<Calendar clientId={clientId} />}
      clients={clientList}
      agencyId={agencyId}
      initialProofs={signedProofs}
      initialApprovals={approvals}
      initialFiles={signedFiles}
      initialMeetings={meetings ?? []}
      initialMessages={(messages ?? []) as MessageRow[]}
      clientId={clientId}
      clientName={clientName}
      userId={user.id}
    />
  );
}
