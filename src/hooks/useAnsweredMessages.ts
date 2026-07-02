"use client";

import { useEffect, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export type FeedMessage = {
  id: string;
  nickname: string | null;
  content: string;
  answer: string | null;
  model: string | null;
  status: string;
  classification: {
    is_question?: boolean;
    score?: number;
    reason?: string;
  } | null;
  created_at: string;
  answered_at: string | null;
};

export function useAnsweredMessages() {
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const res = await fetch("/api/public/messages", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { messages: FeedMessage[] };
        if (cancelled) return;
        const initial = json.messages ?? [];
        initial.forEach((m) => seenRef.current.add(m.id));
        setMessages(initial);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();

    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const channel = supabase
      .channel("messages-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { id?: string } | null;
            if (old?.id) {
              seenRef.current.delete(old.id);
              setMessages((prev) => prev.filter((m) => m.id !== old.id));
            }
            return;
          }
          const row = (payload.new ?? payload.old) as FeedMessage | null;
          if (!row || !row.id) return;
          if (row.status && row.status !== "chat" && row.status !== "answered") {
            return;
          }
          setMessages((prev) => {
            const idx = prev.findIndex((m) => m.id === row.id);
            if (idx === -1) {
              if (seenRef.current.has(row.id)) return prev;
              seenRef.current.add(row.id);
              return [...prev, row];
            }
            const next = prev.slice();
            next[idx] = { ...next[idx], ...row };
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, []);

  return { messages, loading };
}
