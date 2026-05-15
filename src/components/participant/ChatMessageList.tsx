"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/types";

type Props = {
  messages: ChatMessage[];
  myUserId: string;
  loading: boolean;
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function ChatMessageList({ messages, myUserId, loading }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[--ax-text-muted]">
        불러오는 중...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-[--ax-text-muted]">
        아직 채팅이 없어요. 첫 메시지를 남겨보세요!
      </div>
    );
  }

  return (
    <div className="ax-scroll flex-1 overflow-y-auto px-4 py-3">
      <ul className="flex flex-col gap-2">
        {messages.map((m) => {
          const mine = m.userId === myUserId;
          return (
            <li
              key={m.id}
              className={"flex flex-col " + (mine ? "items-end" : "items-start")}
            >
              <div className="flex items-baseline gap-2 px-1">
                <span className="text-xs font-medium text-[--ax-text]">
                  {mine ? "나" : m.nickname}
                </span>
                <span className="text-[10px] text-[--ax-text-muted]">
                  {formatTime(m.ts)}
                </span>
              </div>
              <div
                className={
                  "mt-0.5 max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm " +
                  (mine
                    ? "rounded-tr-md bg-[--hyundai-blue] text-white"
                    : "rounded-tl-md bg-white text-[--ax-text] border border-[--ax-border]")
                }
              >
                {m.text}
              </div>
            </li>
          );
        })}
      </ul>
      <div ref={endRef} />
    </div>
  );
}
