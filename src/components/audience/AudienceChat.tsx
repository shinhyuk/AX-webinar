"use client";

import { useEffect, useRef, useState } from "react";
import { useAnsweredMessages, type FeedMessage } from "@/hooks/useAnsweredMessages";

const MAX_LEN = 500;
const MINE_KEY = "ax.mineIds";
const NICK_KEY = "ax.nickname";

function readMineSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(MINE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function persistMine(ids: Set<string>) {
  try {
    window.sessionStorage.setItem(MINE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

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

function formatTime(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function AudienceChat() {
  const { messages, loading } = useAnsweredMessages();
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMine(readMineSet());
    try {
      const stored = window.localStorage.getItem(NICK_KEY);
      if (stored) setNickname(stored);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    const trimmed = content.trim();
    if (!trimmed) {
      setError("메시지를 입력해주세요.");
      return;
    }
    if (trimmed.length > MAX_LEN) {
      setError(`${MAX_LEN}자 이하로 입력해주세요.`);
      return;
    }
    const nick = nickname.trim();
    try {
      window.localStorage.setItem(NICK_KEY, nick);
    } catch {
      /* ignore */
    }
    setSending(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, nickname: nick || null }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        id?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "전송에 실패했어요.");
      setContent("");
      if (json.id) {
        const next = new Set(mine);
        next.add(json.id);
        setMine(next);
        persistMine(next);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "전송에 실패했어요.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="flex h-[100dvh] flex-col bg-background"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <header className="border-b border-line px-4 py-3">
        <p className="text-[10px] font-semibold tracking-[0.22em] text-accent">
          HYUNDAI AUTOEVER · 한국 HRD 포럼
        </p>
        <h1 className="mt-0.5 text-[17px] font-bold tracking-tight">
          HR-AX 라이브 채팅
        </h1>
      </header>

      <div className="ax-scroll flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-2">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
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
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-dim text-accent ring-1 ring-white/10">
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
            <p className="mt-3 text-sm font-semibold">첫 메시지를 남겨보세요</p>
            <p className="mt-1 text-sm text-muted">
              모두가 서로의 메시지를 실시간으로 볼 수 있어요.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m, idx) => {
              const prev = messages[idx - 1];
              const sameAuthor =
                prev &&
                prev.status === "chat" &&
                (prev.nickname ?? "") === (m.nickname ?? "");
              return (
                <ChatBubble
                  key={m.id}
                  message={m}
                  isMine={mine.has(m.id)}
                  hideAvatar={!!sameAuthor}
                />
              );
            })}
          </ul>
        )}
        <div ref={listEndRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-line bg-background/95 px-3 pt-2 pb-3 backdrop-blur"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.75rem)" }}
      >
        {error ? (
          <p className="mb-2 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-[color:var(--color-danger)]">
            {error}
          </p>
        ) : null}
        <div className="flex items-end gap-2">
          <div className="flex flex-1 flex-col gap-1.5">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="닉네임(선택)"
              maxLength={12}
              className="ax-input w-full rounded-xl px-3 py-1.5 text-[12px]"
            />
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSubmit(e as unknown as React.FormEvent);
                }
              }}
              rows={1}
              maxLength={MAX_LEN}
              placeholder="메시지를 입력하세요"
              className="ax-input ax-scroll max-h-32 min-h-[44px] resize-none rounded-xl px-3 py-2.5 leading-relaxed"
            />
          </div>
          <button
            type="submit"
            disabled={sending || content.trim().length === 0}
            aria-label="전송"
            className="ax-btn flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full p-0"
          >
            {sending ? (
              <span className="inline-flex items-center justify-center gap-0.5">
                <span className="h-1 w-1 animate-bounce rounded-full bg-white/80" />
                <span
                  className="h-1 w-1 animate-bounce rounded-full bg-white/80"
                  style={{ animationDelay: "120ms" }}
                />
                <span
                  className="h-1 w-1 animate-bounce rounded-full bg-white/80"
                  style={{ animationDelay: "240ms" }}
                />
              </span>
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M22 2 11 13" />
                <path d="m22 2-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function ChatBubble({
  message,
  isMine,
  hideAvatar,
}: {
  message: FeedMessage;
  isMine: boolean;
  hideAvatar: boolean;
}) {
  const nickname = message.nickname?.trim() || "익명";
  const hasAnswer = !!message.answer;

  return (
    <li className="ax-fade-in flex flex-col gap-2">
      <div
        className={
          "flex items-end gap-2 " + (isMine ? "flex-row-reverse" : "flex-row")
        }
      >
        {!isMine ? (
          <div className="w-7 shrink-0">
            {!hideAvatar ? (
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
                style={{ backgroundColor: colorFromKey(nickname) }}
              >
                {nickname.slice(0, 1)}
              </div>
            ) : null}
          </div>
        ) : null}
        <div
          className={
            "flex max-w-[80%] flex-col " +
            (isMine ? "items-end" : "items-start")
          }
        >
          {!hideAvatar ? (
            <div className="mb-0.5 flex items-baseline gap-1.5 px-1 text-[11px] text-muted/70">
              <span className="font-medium text-foreground/85">
                {isMine ? "나" : nickname}
              </span>
              <span>{formatTime(message.created_at)}</span>
            </div>
          ) : null}
          <div
            className={
              "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14.5px] leading-relaxed " +
              (isMine
                ? "rounded-tr-md bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                : "rounded-tl-md border border-white/10 bg-white/[0.05] text-foreground")
            }
          >
            {message.content}
          </div>
        </div>
      </div>

      {hasAnswer ? (
        <div className="ax-fade-in flex items-end gap-2">
          <div className="w-7 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 text-[10px] font-bold text-white">
              AX
            </div>
          </div>
          <div className="flex max-w-[82%] flex-col items-start">
            <div className="mb-0.5 flex items-baseline gap-1.5 px-1 text-[11px]">
              <span className="font-semibold text-accent">HR-AX</span>
              <span className="text-muted/70">답변</span>
            </div>
            <div className="whitespace-pre-wrap break-words rounded-2xl rounded-tl-md border border-cyan-400/15 bg-cyan-400/5 px-3.5 py-2 text-[14.5px] leading-relaxed">
              {message.answer}
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}
