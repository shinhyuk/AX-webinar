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

function colorFromId(id: string): string {
  const palette = [
    "#38bdf8",
    "#34d399",
    "#fbbf24",
    "#fb7185",
    "#c084fc",
    "#22d3ee",
    "#f472b6",
    "#2dd4bf",
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return palette[Math.abs(hash) % palette.length];
}

export function ChatMessageList({ messages, myUserId, loading }: Props) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted">
        <span className="inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
            style={{ animationDelay: "120ms" }}
          />
          <span
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
            style={{ animationDelay: "240ms" }}
          />
        </span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="ax-glow-cyan flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-hyundai-accent/25 to-[#7c3aed]/25 text-hyundai-accent ring-1 ring-white/10">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 11.5a8.38 8.38 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-4.7A8.38 8.38 0 0 1 3 11.5a8.5 8.5 0 1 1 18 0z" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">
          아직 채팅이 없어요
        </p>
        <p className="mt-1 text-sm text-muted">첫 메시지를 남겨보세요!</p>
      </div>
    );
  }

  return (
    <div className="ax-scroll flex-1 overflow-y-auto px-4 pt-3 pb-2">
      <ul className="flex flex-col gap-2.5">
        {messages.map((m, idx) => {
          const mine = m.userId === myUserId;
          const prev = messages[idx - 1];
          const sameAuthor = prev && prev.userId === m.userId;
          return (
            <li
              key={m.id}
              className={
                "flex items-end gap-2 " +
                (mine ? "flex-row-reverse" : "flex-row")
              }
            >
              {!mine ? (
                <div className="w-7 shrink-0">
                  {!sameAuthor ? (
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ backgroundColor: colorFromId(m.userId) }}
                    >
                      {m.nickname.slice(0, 1)}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div
                className={
                  "flex max-w-[78%] flex-col " +
                  (mine ? "items-end" : "items-start")
                }
              >
                {!sameAuthor ? (
                  <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px]">
                    <span className="font-semibold text-foreground/90">
                      {mine ? "나" : m.nickname}
                    </span>
                    <span className="text-muted/60">{formatTime(m.ts)}</span>
                  </div>
                ) : null}
                <div
                  className={
                    "whitespace-pre-wrap break-words px-3.5 py-2 text-[14.5px] leading-relaxed backdrop-blur " +
                    (mine
                      ? "rounded-2xl rounded-tr-md bg-gradient-to-br from-hyundai-accent to-[#4a7dff] text-white shadow-lg shadow-hyundai-accent/25"
                      : "rounded-2xl rounded-tl-md bg-white/8 text-foreground border border-white/10")
                  }
                >
                  {m.text}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <div ref={endRef} />
    </div>
  );
}
