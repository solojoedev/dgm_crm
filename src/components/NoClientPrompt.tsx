"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function NoClientPrompt({ agencyId }: { agencyId: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed || !agencyId || adding) return;
    setAdding(true);
    const supabase = createClient();
    const { data, error } = await supabase.from("clients").insert({ agency_id: agencyId, name: trimmed }).select().single();
    setAdding(false);
    if (!error && data) {
      router.push(`/?client=${data.id}`);
    }
  }

  return (
    <div className="no-client">
      <h2>Add your first client</h2>
      <p>Files, proofs, the calendar, and chat are all organized per client — add one to get started.</p>
      <div className="no-client-form">
        <input
          className="add-client-input"
          placeholder="Client name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className="btn primary" onClick={handleAdd} disabled={adding}>
          {adding ? "Adding…" : "Add client"}
        </button>
      </div>
    </div>
  );
}
