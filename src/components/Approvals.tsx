"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ApprovalRow = {
  id: string;
  caption: string | null;
  platform: string;
  status: string;
  note: string | null;
  clientName: string;
};

const platformLabel: Record<string, string> = {
  ig_feed: "IG Feed",
  ig_story: "IG Story",
  ig_reel: "IG Reel",
  flyer: "Flyer",
};

const statusMeta: Record<string, { label: string; chip: string }> = {
  pending_approval: { label: "Pending", chip: "warning" },
  changes_requested: { label: "Changes requested", chip: "critical" },
  approved: { label: "Approved", chip: "success" },
  scheduled: { label: "Scheduled", chip: "success" },
  published: { label: "Published", chip: "success" },
  draft: { label: "Draft", chip: "neutral" },
};

const thumbColors = [
  "linear-gradient(135deg,#B0552E,#6B2E1C)",
  "linear-gradient(135deg,#7C8F6B,#465238)",
  "linear-gradient(135deg,#C9A46A,#8C6B2E)",
  "linear-gradient(135deg,#8B4A2B,#4A2416)",
];

export default function Approvals({ mode, initialApprovals }: { mode: "agency" | "client"; initialApprovals: ApprovalRow[] }) {
  const [approvals, setApprovals] = useState(initialApprovals);

  async function setStatus(id: string, status: string) {
    setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    const supabase = createClient();
    await supabase.from("content_items").update({ status }).eq("id", id);
  }

  const visible = mode === "agency" ? approvals : approvals.filter((a) => ["pending_approval", "changes_requested"].includes(a.status) || a.status === "approved");

  return (
    <section>
      <div className="view-head">
        <h2>Approvals</h2>
        {mode === "agency" ? (
          <p>Status of everything out for client review.</p>
        ) : (
          <p>Review what&apos;s going out under your name before it&apos;s live.</p>
        )}
      </div>

      <div className="approval-list">
        {visible.map((item, idx) => (
          <div className="approval-card" key={item.id}>
            <div className="thumb approval-thumb" style={{ background: thumbColors[idx % thumbColors.length] }}></div>
            <div className="approval-body">
              <div className="approval-row1">
                <span className="approval-title">{item.caption}</span>
                <span className={`chip ${statusMeta[item.status]?.chip ?? "neutral"}`}>
                  {statusMeta[item.status]?.label ?? item.status}
                </span>
              </div>
              <div className="approval-meta">{item.clientName} · {platformLabel[item.platform] ?? item.platform}</div>
              {item.note && <div className="approval-note">&quot;{item.note}&quot; — client</div>}

              {mode === "agency" && item.status === "pending_approval" && (
                <button className="btn">Send reminder</button>
              )}
              {mode === "agency" && item.status === "changes_requested" && (
                <button className="btn primary">Upload revision</button>
              )}

              {mode === "client" && item.status === "pending_approval" && (
                <div className="approval-actions">
                  <button className="btn primary" onClick={() => setStatus(item.id, "approved")}>Approve</button>
                  <button className="btn ghost-critical" onClick={() => setStatus(item.id, "changes_requested")}>Request changes</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
