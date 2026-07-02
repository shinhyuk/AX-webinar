"use client";

import { useEffect, useRef, useState } from "react";
import {
  useAnsweredMessages,
  type FeedMessage,
} from "@/hooks/useAnsweredMessages";

const MAX_LEN = 500;
const MINE_KEY = "ax.mineIds";
const NICK_KEY = "ax.nickname";

function readMineSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.sessionStorage.getItem(MINE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
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
  const [nickname, setNickname] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NICK_KEY);
      setNickname(stored?.trim() ? stored.trim() : null);
    } catch {
      setNickname(null);
    }
    setReady(true);
  }, []);

  function handleNickname(nick: string) {
    try {
      window.localStorage.setItem(NICK_KEY, nick);
    } catch {
      /* ignore */
    }
    setNickname(nick);
  }

  if (!ready) return <div className="h-[100dvh] bg-background" />;

  return (
    <>
      <ChatView nickname={nickname ?? ""} />
      {!nickname ? <NicknameModal onSubmit={handleNickname} /> : null}
    </>
  );
}

function NicknameModal({ onSubmit }: { onSubmit: (nick: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    if (trimmed.length > 12) {
      setError("12자 이하로 입력해주세요.");
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="ax-card ax-fade-in w-full rounded-t-3xl px-6 pt-7 pb-6 sm:max-w-sm sm:rounded-3xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <div className="flex items-center gap-2 text-accent">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <span className="text-[11px] font-semibold tracking-[0.18em]">
            HR-AX 라이브 채팅
          </span>
        </div>
        <h2 className="mt-2 text-[20px] font-bold leading-snug">
          환영합니다 👋
          <br />
          닉네임을 입력해주세요
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          채팅에 표시될 이름이에요. 한 번만 입력하면 됩니다.
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="예: 민지"
          maxLength={12}
          autoFocus
          className="ax-input mt-5 w-full rounded-2xl px-4 py-3.5"
        />
        <div className="mt-1 flex items-center justify-between text-[11px]">
          {error ? (
            <span className="text-[color:var(--color-danger)]">{error}</span>
          ) : (
            <span className="text-muted/70">한글, 영문, 숫자 모두 가능</span>
          )}
          <span className="tabular-nums text-muted/70">{value.length}/12</span>
        </div>
        <button
          type="submit"
          className="ax-btn mt-5 w-full rounded-2xl py-4 text-[15px]"
        >
          채팅 시작하기
        </button>
      </form>
    </div>
  );
}

function ChatView({ nickname }: { nickname: string }) {
  const { messages, loading } = useAnsweredMessages();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const listEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMine(readMineSet());
  }, []);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !nickname) return;
    setError(null);
    const trimmed = content.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_LEN) {
      setError(`${MAX_LEN}자 이하로 입력해주세요.`);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, nickname }),
      });
      const json = (await res.json().catch(() => ({}))) as {
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
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-accent">
            HYUNDAI AUTOEVER · 한국 HRD 포럼
          </p>
          <h1 className="mt-0.5 text-[17px] font-bold tracking-tight">
            HR-AX 라이브 채팅
          </h1>
        </div>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-muted ring-1 ring-white/10">
          {nickname}
        </span>
      </header>

      <div className="ax-scroll flex-1 min-h-0 overflow-y-auto px-3 pt-3 pb-2">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            불러오는 중...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <p className="text-sm font-semibold">첫 메시지를 남겨보세요</p>
            <p className="mt-1 text-sm text-muted">
              질문을 남기면 HR-AX가 답변해드려요.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <ChatItem key={m.id} message={m} isMine={mine.has(m.id)} />
            ))}
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
            className="ax-input ax-scroll max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl px-4 py-2.5 leading-relaxed"
          />
          <button
            type="submit"
            disabled={sending || content.trim().length === 0}
            aria-label="전송"
            className="ax-btn flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full p-0"
          >
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
          </button>
        </div>
      </form>
    </div>
  );
}

function ChatItem({
  message,
  isMine,
}: {
  message: FeedMessage;
  isMine: boolean;
}) {
  const nickname = message.nickname?.trim() || "익명";
  const isQuestion = !!message.classification?.is_question;
  const hasAnswer = !!message.answer;

  return (
    <li className="ax-fade-in flex flex-col gap-2">
      {/* 채팅 버블: 내 것 오른쪽 / 남의 것 왼쪽 */}
      <div
        className={
          "flex items-end gap-2 " + (isMine ? "flex-row-reverse" : "flex-row")
        }
      >
        {!isMine ? (
          <div className="w-7 shrink-0">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ backgroundColor: colorFromKey(nickname) }}
            >
              {nickname.slice(0, 1)}
            </div>
          </div>
        ) : null}
        <div
          className={
            "flex max-w-[80%] flex-col " +
            (isMine ? "items-end" : "items-start")
          }
        >
          <div
            className={
              "mb-0.5 flex items-baseline gap-1.5 px-1 text-[11px] text-muted/70 " +
              (isMine ? "flex-row-reverse" : "")
            }
          >
            <span className="font-medium text-foreground/85">
              {isMine ? "나" : nickname}
            </span>
            <span>{formatTime(message.created_at)}</span>
            {isQuestion ? (
              <span className="rounded-full bg-accent-dim px-1.5 py-px text-[10px] font-bold text-accent">
                질문
              </span>
            ) : null}
          </div>
          <div
            className={
              "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[14.5px] leading-relaxed " +
              (isMine
                ? "rounded-tr-md bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/20 "
                : "rounded-tl-md border border-white/10 bg-white/[0.05] text-foreground ") +
              (isQuestion
                ? "ring-2 ring-accent/50 shadow-[0_0_16px_rgba(0,212,255,0.25)]"
                : "")
            }
          >
            {message.content}
          </div>
        </div>
      </div>

      {/* AI 답변: 우측 정렬, 질문 인용 먼저 표시 */}
      {hasAnswer ? (
        <div className="ax-fade-in flex flex-row-reverse items-end gap-2">
          <div className="w-7 shrink-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 text-[10px] font-bold text-white">
              AX
            </div>
          </div>
          <div className="flex max-w-[85%] flex-col items-end">
            <div className="mb-0.5 flex flex-row-reverse items-baseline gap-1.5 px-1 text-[11px]">
              <span className="font-semibold text-accent">HR-AX</span>
              <span className="text-muted/70">답변</span>
            </div>
            <div className="rounded-2xl rounded-tr-md border border-cyan-400/20 bg-cyan-400/5 px-3.5 py-2.5">
              <p className="mb-1.5 border-l-2 border-accent/40 pl-2 text-[12px] leading-snug text-muted">
                Q. {message.content}
              </p>
              <p className="whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-foreground">
                {message.answer}
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}
