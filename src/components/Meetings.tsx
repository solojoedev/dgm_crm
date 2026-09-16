"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MeetingRow = {
  id: string;
  title: string;
  platform: string;
  join_url: string;
  scheduled_at: string;
};

const platformLabel: Record<string, string> = { zoom: "Zoom", google_meet: "Google Meet" };

function generateLink(platform: string) {
  const rand = (len: number) => Math.random().toString(36).slice(2, 2 + len);
  if (platform === "zoom") {
    return "https://zoom.us/j/" + Math.floor(1000000000 + Math.random() * 8999999999);
  }
  return `https://meet.google.com/${rand(3)}-${rand(4)}-${rand(3)}`;
}

type MeetingsProps = {
  mode: "agency" | "client";
  initialMeetings: MeetingRow[];
  clientId: string | null;
};

export default function Meetings({ mode, initialMeetings, clientId }: MeetingsProps) {
  const [meetings, setMeetings] = useState(initialMeetings);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState("");
  const [platform, setPlatform] = useState("zoom");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!clientId || saving) return;
    setSaving(true);
    const scheduledAt = when ? new Date(when) : new Date();
    const supabase = createClient();
    const { data, error } = await supabase
      .from("meetings")
      .insert({
        client_id: clientId,
        title: title || "New meeting",
        platform,
        join_url: generateLink(platform),
        scheduled_at: scheduledAt.toISOString(),
      })
      .select()
      .single();
    setSaving(false);
    if (!error && data) {
      setMeetings((prev) => [...prev, data as MeetingRow].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
      setTitle("");
      setWhen("");
      setShowForm(false);
    }
  }

  return (
    <section>
      <div className="view-head files-head">
        <div>
          <h2>Meetings</h2>
          {mode === "agency" ? (
            <p>Video calls with every client — links generate automatically, no separate app to juggle.</p>
          ) : (
            <p>Your scheduled calls with Jordan&apos;s team.</p>
          )}
        </div>
        {mode === "agency" && (
          <button className="btn primary" onClick={() => setShowForm((s) => !s)}>
            + Schedule a meeting
          </button>
        )}
      </div>

      {mode === "agency" && showForm && (
        <div className="meeting-form">
          <div className="meeting-form-row">
            <div className="meeting-form-field" style={{ flex: 2 }}>
              <label>Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Content review: August posts" />
            </div>
            <div className="meeting-form-field">
              <label>Date &amp; time</label>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div className="meeting-form-field">
              <label>Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="zoom">Zoom</option>
                <option value="google_meet">Google Meet</option>
              </select>
            </div>
          </div>
          <button className="btn primary" onClick={handleCreate} disabled={saving}>
            {saving ? "Creating…" : "Create & generate link"}
          </button>
        </div>
      )}

      <div className="meeting-list">
        {meetings.map((meeting) => (
          <div className="meeting-card" key={meeting.id}>
            <div className="meeting-platform">🎥</div>
            <div className="meeting-body">
              <div className="meeting-title">{meeting.title}</div>
              <div className="meeting-when">
                {new Date(meeting.scheduled_at).toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                · {platformLabel[meeting.platform] ?? meeting.platform}
              </div>
              <div className="meeting-link">{meeting.join_url.replace(/^https?:\/\//, "")}</div>
            </div>
            <div className="meeting-actions">
              <button className="btn">Copy link</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
