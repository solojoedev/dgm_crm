"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/app/actions";
import { createClient } from "@/lib/supabase/client";

type ClientOption = { id: string; name: string };

type SidebarProps = {
  activeView: string;
  onNavigate: (view: string) => void;
  mode: "agency" | "client";
  onModeChange: (mode: "agency" | "client") => void;
  clients: ClientOption[];
  selectedClientId: string | null;
  agencyId: string | null;
  lockMode: boolean;
};

const navItems = [
  { key: "overview", label: "Overview" },
  { key: "calendar", label: "Calendar" },
  { key: "proofs", label: "Proofs" },
  { key: "approvals", label: "Approvals" },
  { key: "files", label: "Files" },
  { key: "meetings", label: "Meetings" },
  { key: "chat", label: "Chat" },
];

export default function Sidebar({
  activeView,
  onNavigate,
  mode,
  onModeChange,
  clients,
  selectedClientId,
  agencyId,
  lockMode,
}: SidebarProps) {
    const router = useRouter();
    const [newClientName, setNewClientName] = useState("");
    const [adding, setAdding] = useState(false);

    function handleSwitch(id: string) {
        router.push(`/?client=${id}`);
    }

    async function handleAddClient() {
        const name = newClientName.trim();
        if (!name || !agencyId || adding) return;
        setAdding(true);
        const supabase = createClient();
        const { data, error } = await supabase.from("clients").insert({ agency_id: agencyId, name }).select().single();
        setAdding(false);
        if (!error && data) {
            setNewClientName("");
            router.push(`/?client=${data.id}`);
        }
    }

    return (
        <aside className="sidebar">
            <div className="brand">
                <span className="brand-mark">Tandem</span>
                <span className="brand-glyph">⇄</span>
            </div>
            <div className="brand-tag">agency &amp; client, one workspace</div>

            {mode === "agency" && (
                <div className="client-switcher">
                    <select
                        className="client-select"
                        value={selectedClientId ?? ""}
                        onChange={(e) => handleSwitch(e.target.value)}
                    >
                        {clients.length === 0 && <option value="">No clients yet</option>}
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <div className="add-client-row">
                        <input
                            className="add-client-input"
                            placeholder="New client name"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleAddClient()}
                        />
                        <button className="btn" onClick={handleAddClient} disabled={adding}>
                            {adding ? "…" : "+"}
                        </button>
                    </div>
                </div>
            )}

            <nav className="nav-list">
                {navItems.map((item) => (
                    <button
                        key={item.key}
                        className={`nav-item ${activeView === item.key ? "active" : ""}`}
                        onClick={() => onNavigate(item.key)}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="sidebar-footer">
                {lockMode ? (
                    <>
                        <div className="mode-label">Signed in as</div>
                        <div className="mode-static">Client</div>
                    </>
                ) : (
                    <>
                        <div className="mode-label">Viewing as</div>
                        <div className="mode-toggle">
                            <button
                                className={`mode-btn ${mode === "agency" ? "is-active" : ""}`}
                                onClick={() => onModeChange("agency")}
                            >
                                Agency
                            </button>
                            <button
                                className={`mode-btn ${mode === "client" ? "is-active" : ""}`}
                                onClick={() => onModeChange("client")}
                            >
                                Client
                            </button>
                        </div>
                    </>
                )}
                <form action={signOut}>
                    <button className="signout-btn" type="submit">Sign out</button>
                </form>
            </div>
        </aside>
    )
}
