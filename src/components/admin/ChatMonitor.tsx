"use client";

import { useRef } from "react";
import { useChat } from "@/hooks/useChat";
import { usePresence } from "@/hooks/usePresence";
import { ChatMessageList } from "@/components/participant/ChatMessageList";

export function ChatMonitor() {
  const { messages, loading } = useChat();
  const adminIdRef = useRef<string | null>(null);
  if (adminIdRef.current === null) {
    adminIdRef.current = `admin-${Math.random().toString(36).slice(2)}`;
  }
  const online = usePresence({
    userId: adminIdRef.current,
    nickname: "HOST",
    role: "admin",
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-1 pb-2 text-xs text-muted">
        <span>
          총{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {messages.length}
          </span>
          건
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-hyundai-accent/15 px-2.5 py-1 font-semibold text-hyundai-accent ring-1 ring-hyundai-accent/25">
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="tabular-nums">{online}</span>명 접속 중
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-hyundai-accent" />
            실시간
          </span>
        </span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-background">
        <ChatMessageList
          messages={messages}
          myUserId=""
          loading={loading}
          size="large"
        />
      </div>
    </div>
  );
}
