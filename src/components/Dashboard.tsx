"use client";

import { useState, type ReactNode } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import Calendar from "@/components/Calendar";
import Proofs from "@/components/Proofs";
import Approvals from "@/components/Approvals";
import Files from "@/components/Files";
import Meetings from "@/components/Meetings";
import Chat from "@/components/Chat";
import NoClientPrompt from "@/components/NoClientPrompt";

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
  storagePath: string;
  imageUrl: string | null;
};

type ApprovalRow = {
  id: string;
  caption: string | null;
  platform: string;
  status: string;
  note: string | null;
  clientName: string;
  imageUrl: string | null;
};

type PostRow = {
  id: string;
  caption: string | null;
  status: string;
  scheduled_at: string;
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
  clients: ClientOption[];
  agencyId: string | null;
  initialProofs: ProofRow[];
  initialApprovals: ApprovalRow[];
  initialPosts: PostRow[];
  initialFiles: FileRow[];
  initialMeetings: MeetingRow[];
  initialMessages: MessageRow[];
  clientId: string | null;
  clientName: string;
  userId: string;
  isAgencyMember: boolean;
};

export default function Dashboard({
  overview,
  clients,
  agencyId,
  initialProofs,
  initialApprovals,
  initialPosts,
  initialFiles,
  initialMeetings,
  initialMessages,
  clientId,
  clientName,
  userId,
  isAgencyMember,
}: DashboardProps) {
  const [activeView, setActiveView] = useState("overview");
  const [mode, setMode] = useState<"agency" | "client">(isAgencyMember ? "agency" : "client");

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
        lockMode={!isAgencyMember}
      />
      <div className="main">
        <Topbar title={titles[activeView] ?? "Tandem"} mode={mode} />
        <main className="content">
          {activeView === "overview" && overview}
          {activeView !== "overview" && !clientId && <NoClientPrompt agencyId={agencyId} />}
          {activeView === "calendar" && clientId && (
            <Calendar mode={mode} clientId={clientId} clientName={clientName} initialPosts={initialPosts} />
          )}
          {activeView === "proofs" && clientId && <Proofs mode={mode} initialProofs={initialProofs} clientId={clientId} />}
          {activeView === "approvals" && clientId && (
            <Approvals mode={mode} initialApprovals={initialApprovals} clientId={clientId} userId={userId} />
          )}
          {activeView === "files" && clientId && (
            <Files mode={mode} initialFiles={initialFiles} clientId={clientId} clientName={clientName} />
          )}
          {activeView === "meetings" && clientId && (
            <Meetings mode={mode} initialMeetings={initialMeetings} clientId={clientId} />
          )}
          {activeView === "chat" && clientId && (
            <Chat initialMessages={initialMessages} clientId={clientId} userId={userId} clientName={clientName} />
          )}
        </main>
      </div>
    </div>
  );
}
