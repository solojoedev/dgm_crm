import { createClient } from "@/lib/supabase/server";

const statusMeta: Record<string, { label: string; chip: string }> = {
  scheduled: { label: "Scheduled", chip: "success" },
  approved: { label: "Approved", chip: "success" },
  published: { label: "Published", chip: "success" },
  pending_approval: { label: "Pending approval", chip: "warning" },
  changes_requested: { label: "Changes requested", chip: "critical" },
  draft: { label: "Draft", chip: "neutral" },
};

const thumbColors = [
  "linear-gradient(135deg,#C97B4A,#8B4A2B)",
  "linear-gradient(135deg,#B0552E,#6B2E1C)",
  "linear-gradient(135deg,#C9A46A,#8C6B2E)",
  "linear-gradient(135deg,#8B4A2B,#4A2416)",
  "linear-gradient(135deg,#D08A4E,#6B2E1C)",
];

export default async function Calendar({ clientId }: { clientId: string | null }) {
  const supabase = await createClient();

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  let query = supabase
    .from("content_items")
    .select("id, caption, status, scheduled_at, clients(name)")
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString())
    .order("scheduled_at", { ascending: true });

  if (clientId) query = query.eq("client_id", clientId);

  const { data: items } = await query;

  const rows = items ?? [];

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return {
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: d.getDate(),
      posts: rows.filter((item) => new Date(item.scheduled_at as string).toDateString() === d.toDateString()),
    };
  });

  const clientName = (rows[0]?.clients as unknown as { name: string } | null)?.name ?? "your client";

  return (
    <section>
      <div className="view-head">
        <h2>Content calendar</h2>
        <p>{clientName} · next 7 days</p>
      </div>

      <div className="week-row">
        {days.map((day, i) => (
          <div className="cal-col" key={i}>
            <div className="cal-col-head">{day.label} <strong>{day.date}</strong></div>
            {day.posts.map((post, idx) => (
              <div className="post-card" key={post.id}>
                <div className="thumb" style={{ background: thumbColors[idx % thumbColors.length] }}></div>
                <div className="time">
                  {new Date(post.scheduled_at as string).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </div>
                <div className="cap">{post.caption}</div>
                <span className={`chip ${statusMeta[post.status]?.chip ?? "neutral"}`}>
                  {statusMeta[post.status]?.label ?? post.status}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
