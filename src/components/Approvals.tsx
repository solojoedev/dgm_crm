"use client";

import { useRef, useState } from "react";
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

type ApprovalsProps = {
  mode: "agency" | "client";
  initialApprovals: ApprovalRow[];
  clientId: string | null;
  userId: string;
};

export default function Approvals({ mode, initialApprovals, clientId, userId }: ApprovalsProps) {
  const [approvals, setApprovals] = useState(initialApprovals);
  const [remindedId, setRemindedId] = useState<string | null>(null);
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function setStatus(id: string, status: string) {
    setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    const supabase = createClient();
    await supabase.from("content_items").update({ status }).eq("id", id);
  }

  async function handleSendReminder(item: ApprovalRow) {
    if (!clientId) return;
    const supabase = createClient();
    const { error } = await supabase.from("messages").insert({
      client_id: clientId,
      sender_id: userId,
      body: `Reminder: "${item.caption ?? "this post"}" is still waiting on your review.`,
    });
    if (!error) {
      setRemindedId(item.id);
      setTimeout(() => setRemindedId((current) => (current === item.id ? null : current)), 2000);
    }
  }

  function handleReviseClick(id: string) {
    setRevisingId(id);
    fileInputRef.current?.click();
  }

  async function handleReviseFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !revisingId || !clientId) return;
    const id = revisingId;
    setRevisingId(null);

    const supabase = createClient();
    const path = `content/${clientId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("files").upload(path, file);
    if (uploadError) return;

    const { error: updateError } = await supabase
      .from("content_items")
      .update({ storage_path: path, status: "pending_approval" })
      .eq("id", id);
    if (!updateError) {
      setApprovals((prev) => prev.map((a) => (a.id === id ? { ...a, status: "pending_approval" } : a)));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        style={{ display: "none" }}
        onChange={(e) => handleReviseFile(e.target.files)}
      />

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
                <button className="btn" onClick={() => handleSendReminder(item)}>
                  {remindedId === item.id ? "Sent!" : "Send reminder"}
                </button>
              )}
              {mode === "agency" && item.status === "changes_requested" && (
                <button className="btn primary" onClick={() => handleReviseClick(item.id)}>
                  Upload revision
                </button>
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
