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

function questionOf(m: FeedMessage): string {
  return m.classification?.normalized_question?.trim() || m.content;
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
    initialIdsRef.current = new Set(messages.map((m) => m.id));
    setTypedIds(new Set(initialIdsRef.current));
  }, [loading, messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  return (
    <div className="grid h-[100dvh] grid-cols-[7fr_3fr] gap-3 bg-background p-3">
      <PptPanel url={cfg?.ppt_embed_url ?? null} />

      <section className="ax-card flex min-h-0 flex-col overflow-hidden">
        <header className="border-b border-line px-5 py-3">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-accent">
            LIVE Q&amp;A
          </p>
          <h2 className="mt-0.5 text-xl font-bold tracking-tight">
            라이브 채팅
          </h2>
        </header>
        <div className="ax-scroll flex-1 min-h-0 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="text-base text-muted">불러오는 중...</p>
          ) : messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-center text-base text-muted">
                답변된 질문이 여기 표시됩니다
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-6">
              {messages.map((m) => (
                <StageMessage
                  key={m.id}
                  message={m}
                  alreadyTyped={typedIds.has(m.id)}
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
            /control에서 PPT 임베드 URL을 저장하면 여기에 표시됩니다.
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

function StageMessage({
  message,
  alreadyTyped,
  onTyped,
}: {
  message: FeedMessage;
  alreadyTyped: boolean;
  onTyped: () => void;
}) {
  const nickname = message.nickname?.trim() || "익명";
  const question = questionOf(message);
  const answer = message.answer ?? "";

  return (
    <li className="ax-fade-in flex flex-col gap-3">
      <div>
        <div className="mb-1 flex items-baseline gap-2 text-[14px]">
          <span className="font-semibold">{nickname}</span>
          <span className="text-[12px] text-muted/70">질문</span>
        </div>
        <p className="whitespace-pre-wrap break-words text-[22px] leading-snug">
          {question}
        </p>
      </div>
      <div>
        <div className="mb-1 flex items-baseline gap-2 text-[14px]">
          <span className="font-semibold text-accent">HR-AX</span>
          <span className="text-[12px] text-muted/70">답변</span>
        </div>
        <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3">
          <p className="whitespace-pre-wrap break-words text-[24px] leading-snug">
            <Typewriter
              text={answer}
              instant={alreadyTyped}
              onDone={onTyped}
            />
          </p>
        </div>
      </div>
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
