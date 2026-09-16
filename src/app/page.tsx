import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/Dashboard";
import Overview from "@/components/Overview";
import Calendar from "@/components/Calendar";
import Files from "@/components/Files";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: client } = await supabase.from("clients").select("id, name").limit(1).maybeSingle();

  const [{ data: proofs }, { data: approvalRows }, { data: meetings }, { data: messages }] = await Promise.all([
    supabase.from("proofs").select("id, caption, expires_at, liked").order("expires_at", { ascending: true }),
    supabase
      .from("content_items")
      .select("id, caption, platform, status, note, clients(name)")
      .order("created_at", { ascending: false }),
    supabase.from("meetings").select("id, title, platform, join_url, scheduled_at").order("scheduled_at", { ascending: true }),
    client
      ? supabase
          .from("messages")
          .select("id, body, created_at, sender_id")
          .eq("client_id", client.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

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
      calendar={<Calendar />}
      files={<Files />}
      initialProofs={proofs ?? []}
      initialApprovals={approvals}
      initialMeetings={meetings ?? []}
      initialMessages={(messages ?? []) as { id: string; body: string; created_at: string; sender_id: string | null }[]}
      clientId={client?.id ?? null}
      clientName={client?.name ?? "your client"}
      userId={user.id}
    />
  );
}
