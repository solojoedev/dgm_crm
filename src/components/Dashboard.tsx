"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Proofs from "@/components/Proofs";
import Approvals from "@/components/Approvals";
import Files from "@/components/Files";
import Meetings from "@/components/Meetings";
import Chat from "@/components/Chat";

const titles: Record<string, string> = {
  overview: "Overview",
  calendar: "Content calendar",
  proofs: "Proofs",
  approvals: "Approvals",
  files: "Files",
  meetings: "Meetings",
  chat: "Chat",
};

type ClientOption = { id: string; name: string };

type ProofRow = {
  id: string;
  caption: string | null;
  expires_at: string;
  liked: boolean;
  imageUrl: string | null;
};

type ApprovalRow = {
  id: string;
  caption: string | null;
  platform: string;
  status: string;
  note: string | null;
  clientName: string;
};

type FileRow = {
  id: string;
  name: string;
  status: string;
  created_at: string;
  url: string | null;
};

type MeetingRow = {
  id: string;
  title: string;
  platform: string;
  join_url: string;
  scheduled_at: string;
};

type MessageRow = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string | null;
};

type DashboardProps = {
  overview: ReactNode;
  calendar: ReactNode;
  clients: ClientOption[];
  agencyId: string | null;
  initialProofs: ProofRow[];
  initialApprovals: ApprovalRow[];
  initialFiles: FileRow[];
  initialMeetings: MeetingRow[];
  initialMessages: MessageRow[];
  clientId: string | null;
  clientName: string;
  userId: string;
};

export default function Dashboard({
  overview,
  calendar,
  clients,
  agencyId,
  initialProofs,
  initialApprovals,
  initialFiles,
  initialMeetings,
  initialMessages,
  clientId,
  clientName,
  userId,
}: DashboardProps) {
  const [activeView, setActiveView] = useState("overview");
  const [mode, setMode] = useState<"agency" | "client">("agency");

  return (
    <div className="app">
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        mode={mode}
        onModeChange={setMode}
        clients={clients}
        selectedClientId={clientId}
        agencyId={agencyId}
      />
      <div className="main">
        <Topbar title={titles[activeView] ?? "Tandem"} mode={mode} />
        <main className="content">
          {activeView === "overview" && overview}
          {activeView === "calendar" && calendar}
          {activeView === "proofs" && <Proofs mode={mode} initialProofs={initialProofs} clientId={clientId} />}
          {activeView === "approvals" && <Approvals mode={mode} initialApprovals={initialApprovals} />}
          {activeView === "files" && <Files initialFiles={initialFiles} clientId={clientId} clientName={clientName} />}
          {activeView === "meetings" && (
            <Meetings mode={mode} initialMeetings={initialMeetings} clientId={clientId} />
          )}
          {activeView === "chat" && (
            <Chat initialMessages={initialMessages} clientId={clientId} userId={userId} clientName={clientName} />
          )}
        </main>
      </div>
    </div>
  );
}
