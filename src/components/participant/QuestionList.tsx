"use client";

import type { Question } from "@/lib/types";

type Props = {
  pending: Question[];
  answered: Question[];
  myUserId: string;
  loading: boolean;
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function QuestionCard({ q, mine }: { q: Question; mine: boolean }) {
  return (
    <article
      className={
        "rounded-2xl px-4 py-3 transition-all " +
        (q.answered
          ? "border border-white/5 bg-white/[0.02] text-muted"
          : "ax-card text-foreground")
      }
    >
      <header className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span
            className={
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold " +
              (q.answered
                ? "bg-white/8 text-muted"
                : "bg-hyundai-accent/15 text-hyundai-accent")
            }
          >
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (q.answered ? "bg-muted" : "bg-hyundai-accent animate-pulse")
              }
            />
            {q.answered ? "답변완료" : "대기중"}
          </span>
          <span className="font-medium text-foreground/80">
            {mine ? "나" : q.nickname}
          </span>
        </div>
        <span className="text-[10px] text-muted/60">{formatTime(q.ts)}</span>
      </header>
      <p
        className={
          "mt-2 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed " +
          (q.answered ? "text-muted" : "text-foreground")
        }
      >
        {q.text}
      </p>
    </article>
  );
}

export function QuestionList({ pending, answered, myUserId, loading }: Props) {
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

  if (pending.length === 0 && answered.length === 0) {
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
            <circle cx="12" cy="12" r="9" />
            <path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
            <line x1="12" y1="17" x2="12" y2="17.01" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-semibold text-foreground">
          아직 등록된 질문이 없어요
        </p>
        <p className="mt-1 text-sm text-muted">발표자에게 첫 질문을 남겨보세요</p>
      </div>
    );
  }

  return (
    <div className="ax-scroll flex-1 overflow-y-auto px-3 pt-3 pb-2">
      <div className="flex flex-col gap-2.5">
        {pending.map((q) => (
          <QuestionCard key={q.id} q={q} mine={q.userId === myUserId} />
        ))}
        {answered.length > 0 ? (
          <div className="mt-4 mb-1 flex items-center gap-2">
            <span className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] font-semibold tracking-[0.22em] text-muted">
              답변완료 · {answered.length}
            </span>
            <span className="h-px flex-1 bg-white/10" />
          </div>
        ) : null}
        {answered.map((q) => (
          <QuestionCard key={q.id} q={q} mine={q.userId === myUserId} />
        ))}
      </div>
    </div>
  );
}
