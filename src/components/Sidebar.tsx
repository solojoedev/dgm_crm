"use client";

import { signOut } from "@/app/actions";

type SidebarProps = {
  activeView: string;
  onNavigate: (view: string) => void;
  mode: "agency" | "client";
  onModeChange: (mode: "agency" | "client") => void;
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

export default function Sidebar({ activeView, onNavigate, mode, onModeChange }: SidebarProps) {
    return (
        <aside className="sidebar">
            <div className="brand">
                <span className="brand-mark">Tandem</span>
                <span className="brand-glyph">⇄</span>
            </div>
            <div className="brand-tag">agency &amp; client, one workspace</div>

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
                <form action={signOut}>
                    <button className="signout-btn" type="submit">Sign out</button>
                </form>
            </div>
        </aside>
    )
}
