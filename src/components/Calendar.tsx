"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Post = {
  id: string;
  caption: string | null;
  platform: string;
  status: string;
  scheduled_at: string | null;
  imageUrl: string | null;
};

const statusMeta: Record<string, { label: string; chip: string }> = {
  draft: { label: "Planning", chip: "neutral" },
  pending_approval: { label: "Pending approval", chip: "warning" },
  changes_requested: { label: "Changes requested", chip: "critical" },
  approved: { label: "Approved", chip: "success" },
  scheduled: { label: "Scheduled", chip: "success" },
  published: { label: "Completed", chip: "success" },
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [editPlatform, setEditPlatform] = useState("ig_feed");
  const [editStatus, setEditStatus] = useState("draft");
  const [editWhen, setEditWhen] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const editFileRef = useRef<HTMLInputElement>(null);

  const selectedPost = posts.find((p) => p.id === selectedId) ?? null;

  function openNewPost(date: Date) {
    const d = new Date(date);
    d.setHours(9, 0, 0, 0);
    setEditCaption("");
    setEditPlatform("ig_feed");
    setEditStatus("pending_approval");
    setEditWhen(toLocalDatetimeInput(d));
    setEditFile(null);
    setIsNew(true);
    setSelectedId("__new__");
  }

  function openPost(post: Post) {
    setEditCaption(post.caption ?? "");
    setEditPlatform(post.platform);
    setEditStatus(post.status);
    setEditWhen(post.scheduled_at ? toLocalDatetimeInput(new Date(post.scheduled_at)) : "");
    setEditFile(null);
    setIsNew(false);
    setSelectedId(post.id);
  }

  function closeModal() {
    setSelectedId(null);
    setIsNew(false);
  }

  async function handleSave() {
    if (!clientId || !editCaption.trim() || saving) return;
    setSaving(true);
    const supabase = createClient();

    let storagePath: string | undefined;
    let imageUrl: string | null | undefined;
    if (editFile) {
      const path = `content/${clientId}/${Date.now()}-${editFile.name}`;
      const { error: uploadError } = await supabase.storage.from("files").upload(path, editFile);
      if (!uploadError) {
        storagePath = path;
        const { data: signed } = await supabase.storage.from("files").createSignedUrl(path, 3600);
        imageUrl = signed?.signedUrl ?? null;
      }
    }

    const scheduledAt = editWhen ? new Date(editWhen).toISOString() : null;

    if (isNew) {
      const { data, error } = await supabase
        .from("content_items")
        .insert({
          client_id: clientId,
          caption: editCaption.trim(),
          platform: editPlatform,
          status: editStatus,
          scheduled_at: scheduledAt,
          storage_path: storagePath ?? null,
        })
        .select()
        .single();
      setSaving(false);
      if (!error && data) {
        setPosts((prev) => [...prev, { ...(data as Omit<Post, "imageUrl">), imageUrl: imageUrl ?? null }]);
        closeModal();
      }
      return;
    }

    if (!selectedId) return;
    const updates: Record<string, unknown> = {
      caption: editCaption.trim(),
      platform: editPlatform,
      status: editStatus,
      scheduled_at: scheduledAt,
    };
    if (storagePath) updates.storage_path = storagePath;

    const { error } = await supabase.from("content_items").update(updates).eq("id", selectedId);
    setSaving(false);
    if (!error) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === selectedId
            ? { ...p, caption: editCaption.trim(), platform: editPlatform, status: editStatus, scheduled_at: scheduledAt, imageUrl: imageUrl ?? p.imageUrl }
            : p
        )
      );
      closeModal();
    }
  }

  async function handleDelete() {
    if (!selectedId || isNew) return;
    const supabase = createClient();
    await supabase.from("content_items").delete().eq("id", selectedId);
    setPosts((prev) => prev.filter((p) => p.id !== selectedId));
    closeModal();
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

  const storyboardPosts = posts
    .filter((p) => p.imageUrl)
    .sort((a, b) => (a.scheduled_at ?? "9999").localeCompare(b.scheduled_at ?? "9999"));

  return (
    <section>
      <div className="view-head files-head">
        <div>
          <h2>Content calendar</h2>
          <p>{clientName}</p>
        </div>
        {mode === "agency" && (
          <button className="btn primary" onClick={() => openNewPost(new Date())}>
            + New post
          </button>
        )}
      </div>

      <div className="cal-layout">
        <div>
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
                    <button className="cal-day-add" onClick={() => openNewPost(cell.date)} title="Add post">+</button>
                  )}
                </div>
                <div className="cal-day-posts">
                  {cell.posts.map((post) => (
                    <button
                      key={post.id}
                      className={`cal-post-chip chip-${statusMeta[post.status]?.chip ?? "neutral"}`}
                      onClick={() => openPost(post)}
                    >
                      {post.caption || "Untitled"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="storyboard">
          <div className="storyboard-head">IG Storyboard</div>
          <div className="storyboard-grid">
            {storyboardPosts.length === 0 && (
              <p style={{ gridColumn: "span 3", color: "var(--muted)", fontSize: ".8rem" }}>
                Add photos to posts and they&apos;ll line up here as a preview of the feed.
              </p>
            )}
            {storyboardPosts.map((post) => (
              <button key={post.id} className="storyboard-cell" onClick={() => openPost(post)} title={post.caption ?? ""}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.imageUrl!} alt="" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedId && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            {selectedPost?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedPost.imageUrl} alt="" className="modal-image" />
            ) : (
              <div className="modal-image" style={{ background: thumbColors[0] }}></div>
            )}
            <div className="modal-body">
              {mode === "agency" ? (
                <>
                  <label className="field-label">Caption</label>
                  <input className="field-input" value={editCaption} onChange={(e) => setEditCaption(e.target.value)} />

                  <div className="meeting-form-row" style={{ marginTop: 10 }}>
                    <div className="meeting-form-field">
                      <label>Platform</label>
                      <select value={editPlatform} onChange={(e) => setEditPlatform(e.target.value)}>
                        <option value="ig_feed">IG Feed</option>
                        <option value="ig_story">IG Story</option>
                        <option value="ig_reel">IG Reel</option>
                        <option value="flyer">Flyer</option>
                      </select>
                    </div>
                    <div className="meeting-form-field">
                      <label>Status</label>
                      <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                        <option value="draft">Planning</option>
                        <option value="pending_approval">Pending approval</option>
                        <option value="changes_requested">Changes requested</option>
                        <option value="approved">Approved</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Completed</option>
                      </select>
                    </div>
                  </div>

                  <div className="meeting-form-row">
                    <div className="meeting-form-field">
                      <label>Date &amp; time</label>
                      <input type="datetime-local" value={editWhen} onChange={(e) => setEditWhen(e.target.value)} />
                    </div>
                    <div className="meeting-form-field">
                      <label>{selectedPost?.imageUrl ? "Replace photo/video" : "Photo/video"}</label>
                      <input ref={editFileRef} type="file" accept="image/*,video/*" onChange={(e) => setEditFile(e.target.files?.[0] ?? null)} />
                    </div>
                  </div>

                  <div className="approval-actions" style={{ marginTop: 12 }}>
                    <button className="btn primary" onClick={handleSave} disabled={saving}>
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                    {!isNew && <button className="btn ghost-critical" onClick={handleDelete}>Delete</button>}
                    {selectedPost?.imageUrl && (
                      <a className="btn" href={selectedPost.imageUrl} download target="_blank" rel="noopener noreferrer">Download</a>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="approval-row1">
                    <span className="approval-title">{selectedPost?.caption}</span>
                    <span className={`chip ${statusMeta[selectedPost?.status ?? "draft"]?.chip ?? "neutral"}`}>
                      {statusMeta[selectedPost?.status ?? "draft"]?.label ?? selectedPost?.status}
                    </span>
                  </div>
                  <div className="approval-meta">
                    {selectedPost?.scheduled_at
                      ? new Date(selectedPost.scheduled_at).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
                      : "Not scheduled"}
                  </div>
                  <div className="approval-actions" style={{ marginTop: 12 }}>
                    {selectedPost?.status === "pending_approval" && (
                      <>
                        <button className="btn primary" onClick={async () => {
                          const supabase = createClient();
                          await supabase.from("content_items").update({ status: "approved" }).eq("id", selectedId);
                          setPosts((prev) => prev.map((p) => (p.id === selectedId ? { ...p, status: "approved" } : p)));
                          closeModal();
                        }}>Approve</button>
                        <button className="btn ghost-critical" onClick={async () => {
                          const supabase = createClient();
                          await supabase.from("content_items").update({ status: "changes_requested" }).eq("id", selectedId);
                          setPosts((prev) => prev.map((p) => (p.id === selectedId ? { ...p, status: "changes_requested" } : p)));
                          closeModal();
                        }}>Request changes</button>
                      </>
                    )}
                    {selectedPost?.imageUrl && (
                      <a className="btn" href={selectedPost.imageUrl} download target="_blank" rel="noopener noreferrer">Download</a>
                    )}
                  </div>
                </>
              )}
            </div>
            <button className="modal-close" onClick={closeModal} aria-label="Close">✕</button>
          </div>
        </div>
      )}
    </section>
  );
}
