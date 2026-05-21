"use client";

import { useState } from "react";
import { useQuestions } from "@/hooks/useQuestions";
import type { Question } from "@/lib/types";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function Row({
  q,
  onToggle,
  onDelete,
}: {
  q: Question;
  onToggle: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function wrap(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li
      className={
        "rounded-2xl px-4 py-3 transition-all " +
        (q.answered
          ? "border border-white/5 bg-white/[0.02]"
          : "ax-card")
      }
    >
      <div className="flex items-center justify-between text-base">
        <div className="flex items-center gap-2">
          <span
            className={
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-base font-semibold " +
              (q.answered
                ? "bg-line text-muted"
                : "bg-hyundai-accent/12 text-hyundai-accent")
            }
          >
            <span
              className={
                "h-2 w-2 rounded-full " +
                (q.answered ? "bg-muted" : "bg-hyundai-accent animate-pulse")
              }
            />
            {q.answered ? "답변완료" : "대기중"}
          </span>
          <span className="text-xl font-medium text-foreground/80">
            {q.nickname}
          </span>
        </div>
        <span className="text-base text-muted/70">{formatTime(q.ts)}</span>
      </div>
      <p
        className={
          "mt-2 whitespace-pre-wrap break-words text-[63px] leading-snug " +
          (q.answered ? "text-muted" : "text-foreground")
        }
      >
        {q.text}
      </p>
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void wrap(onToggle)}
          className={
            "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 " +
            (q.answered
              ? "ax-btn-glass text-foreground"
              : "ax-btn-primary text-white")
          }
        >
          {q.answered ? "대기중으로" : "답변완료"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm("정말 이 질문을 삭제할까요?")) {
              void wrap(onDelete);
            }
          }}
          className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-all hover:bg-red-500/20 active:scale-95 disabled:opacity-50"
        >
          삭제
        </button>
      </div>
    </li>
  );
}

export function QuestionsAdmin() {
  const { pending, answered, loading, markAnswered, remove } = useQuestions();

  if (loading) {
    return (
      <p className="py-6 text-center text-sm text-muted">불러오는 중...</p>
    );
  }

  if (pending.length === 0 && answered.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        등록된 질문이 없습니다.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs">
        <span className="rounded-full bg-hyundai-accent/12 px-2 py-0.5 font-semibold text-hyundai-accent">
          대기 {pending.length}
        </span>
        <span className="rounded-full bg-line px-2 py-0.5 font-semibold text-muted">
          완료 {answered.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2.5">
        {pending.map((q) => (
          <Row
            key={q.id}
            q={q}
            onToggle={() => markAnswered(q.id, true)}
            onDelete={() => remove(q.id)}
          />
        ))}
        {answered.length > 0 ? (
          <li className="my-2 flex items-center gap-2 text-[10px] font-semibold tracking-[0.22em] text-muted">
            <span className="h-px flex-1 bg-line" />
            답변완료
            <span className="h-px flex-1 bg-line" />
          </li>
        ) : null}
        {answered.map((q) => (
          <Row
            key={q.id}
            q={q}
            onToggle={() => markAnswered(q.id, false)}
            onDelete={() => remove(q.id)}
          />
        ))}
      </ul>
    </div>
  );
}
