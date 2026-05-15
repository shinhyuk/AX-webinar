"use client";

import { useCallback, useEffect, useState } from "react";
import { usePusherChannel } from "@/hooks/usePusherChannel";
import type { ChatMessage } from "@/lib/types";

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { messages: ChatMessage[] };
      setMessages(data.messages);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  usePusherChannel<ChatMessage>("chat", "new-message", (msg) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      const next = [...prev, msg];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  });

  usePusherChannel("admin", "reset", () => setMessages([]));

  const send = useCallback(
    async (input: { userId: string; nickname: string; text: string }) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "메시지 전송에 실패했습니다.");
      }
    },
    [],
  );

  return { messages, loading, send, refresh };
}
