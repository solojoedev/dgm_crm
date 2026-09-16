"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MessageRow = {
  id: string;
  body: string;
  created_at: string;
  sender_id: string | null;
};

type ChatProps = {
  initialMessages: MessageRow[];
  clientId: string | null;
  userId: string;
  clientName: string;
};

export default function Chat({ initialMessages, clientId, userId, clientName }: ChatProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    if (!clientId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`messages-${clientId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `client_id=eq.${clientId}` },
        (payload) => {
          const incoming = payload.new as MessageRow;
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  async function handleSend() {
    if (!draft.trim() || !clientId || sending) return;
    setSending(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({ client_id: clientId, sender_id: userId, body: draft })
      .select()
      .single();
    setSending(false);
    if (!error && data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data as MessageRow]));
      setDraft("");
    }
  }

  return (
    <section>
      <div className="view-head">
        <h2>Chat</h2>
        <p>Messages with {clientName}.</p>
      </div>

      <div className="chat-wrap chat-wrap-single">
        <div className="thread">
          <div className="thread-head">{clientName}</div>
          <div className="thread-body" ref={bodyRef}>
            {messages.length === 0 && (
              <p style={{ color: "var(--muted)", fontSize: ".85rem" }}>No messages yet — say hello.</p>
            )}
            {messages.map((m) => (
              <div className={`msg ${m.sender_id === userId ? "me" : "them"}`} key={m.id}>
                {m.body}
                <span className="ts">
                  {new Date(m.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
          <div className="composer">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Write a message…"
            />
            <button className="send-btn" onClick={handleSend} aria-label="Send">➤</button>
          </div>
        </div>
      </div>
    </section>
  );
}
