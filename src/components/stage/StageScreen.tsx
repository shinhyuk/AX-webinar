"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  useAnsweredMessages,
  type FeedMessage,
} from "@/hooks/useAnsweredMessages";

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json();
};

function colorFromKey(key: string): string {
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
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

export function StageScreen() {
  const { data: cfg } = useSWR<{ ppt_embed_url: string | null }>(
    "/api/public/config",
    fetcher,
    { refreshInterval: 30000 },
  );
  const { messages, loading } = useAnsweredMessages();
  const [typedIds, setTypedIds] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement | null>(null);
  const initialIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (initialIdsRef.current !== null) return;
    if (loading) return;
    initialIdsRef.current = new Set(
      messages.filter((m) => m.answer).map((m) => m.id),
    );
    setTypedIds(new Set(initialIdsRef.current));
  }, [loading, messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  return (
    <div className="grid h-[100dvh] grid-cols-[7fr_3fr] gap-3 bg-background p-3">
      <PptPanel url={cfg?.ppt_embed_url ?? null} />

      <section className="ax-card flex min-h-0 flex-col overflow-hidden">
        <header className="border-b border-line px-5 py-3">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-accent">
            LIVE CHAT
          </p>
          <h2 className="mt-0.5 text-xl font-bold tracking-tight">
            실시간 채팅
          </h2>
        </header>
        <div className="ax-scroll flex-1 min-h-0 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="text-base text-muted">불러오는 중...</p>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-base text-muted">
                청중 메시지가 여기 표시됩니다
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-4">
              {messages.map((m) => (
                <StageItem
                  key={m.id}
                  message={m}
                  alreadyTyped={!!m.answer && typedIds.has(m.id)}
                  onTyped={() =>
                    setTypedIds((prev) => {
                      if (prev.has(m.id)) return prev;
                      const next = new Set(prev);
                      next.add(m.id);
                      return next;
                    })
                  }
                />
              ))}
            </ul>
          )}
          <div ref={endRef} />
        </div>
      </section>
    </div>
  );
}

function PptPanel({ url }: { url: string | null }) {
  if (!url) {
    return (
      <section className="ax-card flex min-h-0 items-center justify-center overflow-hidden">
        <div className="px-8 text-center text-muted">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-accent">
            PPT EMBED
          </p>
          <p className="mt-2 text-base">
            /control에서 PPT를 업로드하면 여기에 표시됩니다.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section className="ax-card overflow-hidden">
      <iframe
        src={url}
        className="h-full w-full"
        frameBorder={0}
        allow="fullscreen"
        title="presentation"
      />
    </section>
  );
}

function StageItem({
  message,
  alreadyTyped,
  onTyped,
}: {
  message: FeedMessage;
  alreadyTyped: boolean;
  onTyped: () => void;
}) {
  const nickname = message.nickname?.trim() || "익명";
  const isQuestion = !!message.classification?.is_question;
  const hasAnswer = !!message.answer;

  return (
    <li className="ax-fade-in flex flex-col gap-2.5">
      {/* 청중 채팅: 좌측 */}
      <div className="flex items-end gap-2">
        <div className="w-9 shrink-0">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: colorFromKey(nickname) }}
          >
            {nickname.slice(0, 1)}
          </div>
        </div>
        <div className="flex max-w-[92%] flex-col items-start">
          <div className="mb-0.5 flex items-baseline gap-2 text-[13px]">
            <span className="font-semibold">{nickname}</span>
            {isQuestion ? (
              <span className="rounded-full bg-accent-dim px-2 py-px text-[11px] font-bold text-accent">
                질문
              </span>
            ) : null}
          </div>
          <p
            className={
              "whitespace-pre-wrap break-words rounded-2xl rounded-tl-md border px-4 py-2.5 text-[18px] leading-snug " +
              (isQuestion
                ? "border-accent/40 bg-accent-dim/60 ring-2 ring-accent/40 shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                : "border-white/10 bg-white/[0.05]")
            }
          >
            {message.content}
          </p>
        </div>
      </div>

      {/* AI 답변: 우측, 질문 인용 먼저 */}
      {hasAnswer ? (
        <div className="flex flex-row-reverse items-end gap-2">
          <div className="w-9 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 text-[11px] font-bold text-white">
              AX
            </div>
          </div>
          <div className="flex max-w-[92%] flex-col items-end">
            <div className="mb-0.5 flex flex-row-reverse items-baseline gap-2 text-[13px]">
              <span className="font-semibold text-accent">HR-AX</span>
            </div>
            <div className="rounded-2xl rounded-tr-md border border-cyan-400/20 bg-cyan-400/5 px-4 py-3">
              <p className="mb-2 border-r-2 border-accent/40 pr-2 text-right text-[14px] leading-snug text-muted">
                Q. {message.content}
              </p>
              <p className="whitespace-pre-wrap break-words text-[20px] leading-snug">
                <Typewriter
                  text={message.answer ?? ""}
                  instant={alreadyTyped}
                  onDone={onTyped}
                />
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function Typewriter({
  text,
  instant,
  onDone,
}: {
  text: string;
  instant: boolean;
  onDone: () => void;
}) {
  const [shown, setShown] = useState(instant ? text : "");
  const doneRef = useRef(false);

  useEffect(() => {
    if (instant) {
      setShown(text);
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return;
    }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone();
        }
      }
    }, 24);
    return () => window.clearInterval(id);
  }, [text, instant, onDone]);

  return (
    <>
      {shown}
      {!instant && shown.length < text.length ? (
        <span className="ax-caret" aria-hidden />
      ) : null}
    </>
  );
}
