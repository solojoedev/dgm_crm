import { createClient } from "@/lib/supabase/server";

const statusChip: Record<string, string> = {
  pending_approval: "warning",
  changes_requested: "critical",
};

const statusLabel: Record<string, string> = {
  pending_approval: "Pending",
  changes_requested: "Changes",
};

export default async function Overview() {
  const supabase = await createClient();

  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    { count: pendingCount },
    { count: scheduledCount },
    { count: messageCount },
    { data: nextDeadlineRows },
    { data: attention },
  ] = await Promise.all([
    supabase.from("content_items").select("*", { count: "exact", head: true }).eq("status", "pending_approval"),
    supabase
      .from("content_items")
      .select("*", { count: "exact", head: true })
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", weekFromNow.toISOString()),
    supabase.from("messages").select("*", { count: "exact", head: true }),
    supabase
      .from("content_items")
      .select("caption, scheduled_at, clients(name)")
      .gte("scheduled_at", now.toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(1),
    supabase
      .from("content_items")
      .select("id, caption, status, clients(name, scope_color)")
      .in("status", ["pending_approval", "changes_requested"])
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const next = nextDeadlineRows?.[0] as { caption: string; clients: { name: string } | null } | undefined;

  return (
    <section>
      <div className="view-head">
        <h2>Overview</h2>
        <p>Here&apos;s what&apos;s happening across your account this week.</p>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="label">Pending approvals</div>
          <div className="value">{pendingCount ?? 0}</div>
          <div className="foot">awaiting client review</div>
        </div>
        <div className="stat-card">
          <div className="label">Scheduled this week</div>
          <div className="value">{scheduledCount ?? 0}</div>
          <div className="foot">posts across all platforms</div>
        </div>
        <div className="stat-card">
          <div className="label">Messages</div>
          <div className="value">{messageCount ?? 0}</div>
          <div className="foot">total in inbox</div>
        </div>
        <div className="stat-card">
          <div className="label">Next deadline</div>
          <div className="value" style={{ fontSize: "1.15rem" }}>
            {next ? next.caption : "Nothing scheduled"}
          </div>
          <div className="foot">{next?.clients?.name ?? ""}</div>
        </div>
      </div>

      <div className="panel">
        <h3>Needs your attention</h3>
        {attention && attention.length > 0 ? (
          attention.map((item) => {
            const client = item.clients as unknown as { name: string; scope_color: string } | null;
            return (
              <div className="attn-row" key={item.id}>
                <span className="dot" style={{ background: client?.scope_color ?? "#999" }}></span>
                <div style={{ flex: 1 }}>
                  <div className="what">{item.caption}</div>
                  <div className="who">{client?.name}</div>
                </div>
                <span className={`chip ${statusChip[item.status]}`}>{statusLabel[item.status]}</span>
              </div>
            );
          })
        ) : (
          <p style={{ color: "var(--muted)", fontSize: ".86rem" }}>Nothing needs attention right now.</p>
        )}
      </div>
    </section>
  );
}
