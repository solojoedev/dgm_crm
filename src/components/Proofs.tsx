"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProofRow = {
  id: string;
  caption: string | null;
  expires_at: string;
  liked: boolean;
  storagePath: string;
  imageUrl: string | null;
};

const thumbColors = [
  "linear-gradient(135deg,#C9A46A,#8C6B2E)",
  "linear-gradient(135deg,#B0552E,#6B2E1C)",
  "linear-gradient(135deg,#8B4A2B,#4A2416)",
  "linear-gradient(135deg,#C97B4A,#8B4A2B)",
  "linear-gradient(135deg,#D08A4E,#6B2E1C)",
  "linear-gradient(135deg,#7C8F6B,#465238)",
];

function daysUntil(dateStr: string) {
  const ms = new Date(dateStr).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function urgencyFor(daysLeft: number) {
  if (daysLeft <= 3) return "crit";
  if (daysLeft <= 7) return "warn";
  return "ok";
}

type ProofsProps = {
  mode: "agency" | "client";
  initialProofs: ProofRow[];
  clientId: string | null;
};

export default function Proofs({ mode, initialProofs, clientId }: ProofsProps) {
  const [proofs, setProofs] = useState(initialProofs);
  const [uploading, setUploading] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function toggleLike(id: string, liked: boolean) {
    setProofs((prev) => prev.map((p) => (p.id === id ? { ...p, liked } : p)));
    const supabase = createClient();
    await supabase.from("proofs").update({ liked }).eq("id", id);
  }

  async function handleAddToCalendar(proof: ProofRow) {
    if (!clientId) return;
    const supabase = createClient();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const { error } = await supabase.from("content_items").insert({
      client_id: clientId,
      caption: proof.caption,
      storage_path: proof.storagePath,
      platform: "ig_feed",
      status: "pending_approval",
      scheduled_at: tomorrow.toISOString(),
    });
    if (!error) {
      setAddedIds((prev) => new Set(prev).add(proof.id));
    }
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || !clientId) return;
    setUploading(true);
    const supabase = createClient();
    const newRows: ProofRow[] = [];

    for (const file of Array.from(fileList)) {
      const path = `proofs/${clientId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from("files").upload(path, file);
      if (uploadError) continue;

      const mediaType = file.type.startsWith("video") ? "video" : "image";
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data: inserted, error: insertError } = await supabase
        .from("proofs")
        .insert({ client_id: clientId, storage_path: path, media_type: mediaType, caption: file.name, expires_at: expiresAt })
        .select()
        .single();
      if (insertError || !inserted) continue;

      const { data: signed } = await supabase.storage.from("files").createSignedUrl(path, 3600);
      newRows.push({
        id: inserted.id,
        caption: inserted.caption,
        expires_at: inserted.expires_at,
        liked: false,
        storagePath: path,
        imageUrl: signed?.signedUrl ?? null,
      });
    }

    setProofs((prev) => [...newRows, ...prev]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <section>
      <div className="view-head files-head">
        <div>
          <h2>Proofs</h2>
          {mode === "agency" ? (
            <p>Raw uploads clear automatically 30 days after they&apos;re added — pull client favorites into the calendar before then.</p>
          ) : (
            <p>Tap the heart on anything you&apos;d like us to use. Anything left unpicked clears automatically after 30 days.</p>
          )}
        </div>
        {mode === "agency" && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button className="btn primary" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "+ Upload photos/videos"}
            </button>
          </>
        )}
      </div>

      <div className="proof-grid">
        {proofs.map((proof, idx) => {
          const daysLeft = daysUntil(proof.expires_at);
          const urgency = urgencyFor(daysLeft);
          return (
            <div className={`proof-card ${proof.liked ? "liked" : ""}`} key={proof.id}>
              <div className={`proof-expiry ${urgency !== "ok" ? urgency : ""}`}>
                {daysLeft} day{daysLeft === 1 ? "" : "s"} left
              </div>
              {proof.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={proof.imageUrl} alt={proof.caption ?? ""} className="proof-img" />
              ) : (
                <div style={{ position: "absolute", inset: 0, background: thumbColors[idx % thumbColors.length] }}></div>
              )}
              <div className="proof-overlay"><span>{proof.caption}</span></div>
              {proof.liked && mode === "agency" && (
                <button
                  className="btn proof-addcal"
                  onClick={() => handleAddToCalendar(proof)}
                  disabled={addedIds.has(proof.id)}
                >
                  {addedIds.has(proof.id) ? "Added ✓" : "+ Calendar"}
                </button>
              )}
              <button
                className={`proof-heart ${proof.liked ? "liked" : ""}`}
                aria-pressed={proof.liked}
                onClick={() => toggleLike(proof.id, !proof.liked)}
              >
                ♥
              </button>
            </div>
          );
        })}
      </div>

      <div className="proof-legend">
        <div className="lg"><span className="sw" style={{ background: "#4a4a4a" }}></span> Plenty of time</div>
        <div className="lg"><span className="sw" style={{ background: "var(--warning)" }}></span> Expiring within a week</div>
        <div className="lg"><span className="sw" style={{ background: "var(--critical)" }}></span> Expiring within days</div>
      </div>
    </section>
  );
}
