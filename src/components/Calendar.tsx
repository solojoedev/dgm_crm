"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Post = {
  id: string;
  caption: string | null;
  status: string;
  scheduled_at: string;
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

type CalendarProps = {
  mode: "agency" | "client";
  clientId: string | null;
  clientName: string;
  initialPosts: Post[];
};

export default function Calendar({ mode, clientId, clientName, initialPosts }: CalendarProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [showForm, setShowForm] = useState(false);
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("ig_feed");
  const [when, setWhen] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!clientId || !caption.trim() || !when || saving) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("content_items")
      .insert({
        client_id: clientId,
        caption: caption.trim(),
        platform,
        status: "pending_approval",
        scheduled_at: new Date(when).toISOString(),
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setPosts((prev) => [...prev, data as Post]);
      setCaption("");
      setWhen("");
      setShowForm(false);
    }
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return {
      label: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: d.getDate(),
      posts: posts
        .filter((p) => new Date(p.scheduled_at).toDateString() === d.toDateString())
        .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)),
    };
  });

  return (
    <section>
      <div className="view-head files-head">
        <div>
          <h2>Content calendar</h2>
          <p>{clientName} · next 7 days</p>
        </div>
        {mode === "agency" && (
          <button className="btn primary" onClick={() => setShowForm((s) => !s)}>
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
          <button className="btn primary" onClick={handleCreate} disabled={saving}>
            {saving ? "Sending…" : "Send for approval"}
          </button>
        </div>
      )}

      <div className="week-row">
        {days.map((day, i) => (
          <div className="cal-col" key={i}>
            <div className="cal-col-head">{day.label} <strong>{day.date}</strong></div>
            {day.posts.map((post, idx) => (
              <div className="post-card" key={post.id}>
                <div className="thumb" style={{ background: thumbColors[idx % thumbColors.length] }}></div>
                <div className="time">
                  {new Date(post.scheduled_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
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
