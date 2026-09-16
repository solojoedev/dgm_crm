"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProofRow = {
  id: string;
  caption: string | null;
  expires_at: string;
  liked: boolean;
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
};

export default function Proofs({ mode, initialProofs }: ProofsProps) {
  const [proofs, setProofs] = useState(initialProofs);

  async function toggleLike(id: string, liked: boolean) {
    setProofs((prev) => prev.map((p) => (p.id === id ? { ...p, liked } : p)));
    const supabase = createClient();
    await supabase.from("proofs").update({ liked }).eq("id", id);
  }

  return (
    <section>
      <div className="view-head">
        <h2>Proofs</h2>
        {mode === "agency" ? (
          <p>Raw uploads clear automatically 30 days after they&apos;re added — pull client favorites into the calendar before then.</p>
        ) : (
          <p>Tap the heart on anything you&apos;d like us to use. Anything left unpicked clears automatically after 30 days.</p>
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
              <div style={{ position: "absolute", inset: 0, background: thumbColors[idx % thumbColors.length] }}></div>
              <div className="proof-overlay"><span>{proof.caption}</span></div>
              {proof.liked && mode === "agency" && <button className="btn proof-addcal">+ Calendar</button>}
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
