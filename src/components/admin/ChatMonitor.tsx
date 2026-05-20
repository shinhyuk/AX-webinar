"use client";

import { useChat } from "@/hooks/useChat";
import { ChatMessageList } from "@/components/participant/ChatMessageList";

export function ChatMonitor() {
  const { messages, loading } = useChat();

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
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-hyundai-accent" />
          실시간 수신 중
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
