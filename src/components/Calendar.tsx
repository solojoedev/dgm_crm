"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Post = {
  id: string;
  caption: string | null;
  status: string;
  scheduled_at: string | null;
  imageUrl: string | null;
};

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

function toLocalDatetimeInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type CalendarProps = {
  mode: "agency" | "client";
  clientId: string | null;
  clientName: string;
  initialPosts: Post[];
};

export default function Calendar({ mode, clientId, clientName, initialPosts }: CalendarProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("ig_feed");
  const [when, setWhen] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openFormForDate(date: Date) {
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    setWhen(toLocalDatetimeInput(d));
    setShowForm(true);
  }

  async function handleCreate() {
    if (!clientId || !caption.trim() || !when || saving) return;
    setSaving(true);
    const supabase = createClient();

    let storagePath: string | null = null;
    let imageUrl: string | null = null;
    if (file) {
      const path = `content/${clientId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("files").upload(path, file);
      if (!uploadError) {
        storagePath = path;
        const { data: signed } = await supabase.storage.from("files").createSignedUrl(path, 3600);
        imageUrl = signed?.signedUrl ?? null;
      }
    }

    const { data, error } = await supabase
      .from("content_items")
      .insert({
        client_id: clientId,
        caption: caption.trim(),
        platform,
        status: "pending_approval",
        scheduled_at: new Date(when).toISOString(),
        storage_path: storagePath,
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setPosts((prev) => [...prev, { ...(data as Omit<Post, "imageUrl">), imageUrl }]);
      setCaption("");
      setWhen("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowForm(false);
    }
  }

  async function handleSetStatus(id: string, status: string) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
    setSelectedPost((prev) => (prev && prev.id === id ? { ...prev, status } : prev));
    const supabase = createClient();
    await supabase.from("content_items").update({ status }).eq("id", id);
  }

  async function handleUnschedule(id: string) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, scheduled_at: null } : p)));
    setSelectedPost(null);
    const supabase = createClient();
    await supabase.from("content_items").update({ scheduled_at: null }).eq("id", id);
  }

  const monthLabel = viewMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const gridStart = new Date(viewMonth);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());

  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    return {
      date: d,
      inMonth: d.getMonth() === viewMonth.getMonth(),
      isToday: d.toDateString() === new Date().toDateString(),
      posts: posts
        .filter((p) => p.scheduled_at && new Date(p.scheduled_at).toDateString() === d.toDateString())
        .sort((a, b) => (a.scheduled_at ?? "").localeCompare(b.scheduled_at ?? "")),
    };
  });

  return (
    <section>
      <div className="view-head files-head">
        <div>
          <h2>Content calendar</h2>
          <p>{clientName}</p>
        </div>
        {mode === "agency" && (
          <button className="btn primary" onClick={() => { setWhen(""); setShowForm((s) => !s); }}>
            + New post
          </button>
        )}
      </div>

      {mode === "agency" && showForm && (
        <div className="meeting-form">
          <div className="meeting-form-row">
            <div className="meeting-form-field" style={{ flex: 2 }}>
              <label>Caption</label>
              <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Behind the scenes reel" />
            </div>
            <div className="meeting-form-field">
              <label>Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="ig_feed">IG Feed</option>
                <option value="ig_story">IG Story</option>
                <option value="ig_reel">IG Reel</option>
                <option value="flyer">Flyer</option>
              </select>
            </div>
            <div className="meeting-form-field">
              <label>Date &amp; time</label>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
          </div>
          <div className="meeting-form-row">
            <div className="meeting-form-field">
              <label>Photo/video (optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <button className="btn primary" onClick={handleCreate} disabled={saving}>
            {saving ? "Sending…" : "Send for approval"}
          </button>
        </div>
      )}

      <div className="cal-month-head">
        <button className="btn" onClick={() => setViewMonth((m) => { const d = new Date(m); d.setMonth(d.getMonth() - 1); return d; })}>‹</button>
        <div className="cal-month-label">{monthLabel}</div>
        <button className="btn" onClick={() => setViewMonth((m) => { const d = new Date(m); d.setMonth(d.getMonth() + 1); return d; })}>›</button>
      </div>

      <div className="cal-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div className="cal-grid-dow" key={d}>{d}</div>
        ))}
        {cells.map((cell, i) => (
          <div
            key={i}
            className={`cal-day ${cell.inMonth ? "" : "cal-day-out"} ${cell.isToday ? "cal-day-today" : ""}`}
          >
            <div className="cal-day-head">
              <span>{cell.date.getDate()}</span>
              {mode === "agency" && (
                <button className="cal-day-add" onClick={() => openFormForDate(cell.date)} title="Add post">+</button>
              )}
            </div>
            <div className="cal-day-posts">
              {cell.posts.map((post) => (
                <button
                  key={post.id}
                  className={`cal-post-chip chip-${statusMeta[post.status]?.chip ?? "neutral"}`}
                  onClick={() => setSelectedPost(post)}
                >
                  {post.caption || "Untitled"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedPost && (
        <div className="modal-backdrop" onClick={() => setSelectedPost(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {selectedPost.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedPost.imageUrl} alt="" className="modal-image" />
            ) : (
              <div className="modal-image" style={{ background: thumbColors[0] }}></div>
            )}
            <div className="modal-body">
              <div className="approval-row1">
                <span className="approval-title">{selectedPost.caption}</span>
                <span className={`chip ${statusMeta[selectedPost.status]?.chip ?? "neutral"}`}>
                  {statusMeta[selectedPost.status]?.label ?? selectedPost.status}
                </span>
              </div>
              <div className="approval-meta">
                {selectedPost.scheduled_at
                  ? new Date(selectedPost.scheduled_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                  : "Not scheduled"}
              </div>
              <div className="approval-actions" style={{ marginTop: 12 }}>
                <button className="btn primary" onClick={() => handleSetStatus(selectedPost.id, "approved")}>Approve</button>
                <button className="btn ghost-critical" onClick={() => handleSetStatus(selectedPost.id, "changes_requested")}>Request changes</button>
                {mode === "agency" && (
                  <button className="btn" onClick={() => handleUnschedule(selectedPost.id)}>Unschedule</button>
                )}
                {selectedPost.imageUrl && (
                  <a className="btn" href={selectedPost.imageUrl} download target="_blank" rel="noopener noreferrer">Download</a>
                )}
              </div>
            </div>
            <button className="modal-close" onClick={() => setSelectedPost(null)} aria-label="Close">✕</button>
          </div>
        </div>
      )}
    </section>
  );
}
