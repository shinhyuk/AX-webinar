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
        "rounded-xl border px-3 py-2.5 " +
        (q.answered
          ? "border-[--ax-border] bg-[--ax-bg]/50"
          : "border-[--ax-border] bg-white")
      }
    >
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span
            className={
              "rounded-full px-2 py-0.5 text-[10px] font-semibold " +
              (q.answered
                ? "bg-[--ax-border] text-[--ax-text-muted]"
                : "bg-[--hyundai-active-blue]/15 text-[--hyundai-active-blue]")
            }
          >
            {q.answered ? "답변완료" : "대기중"}
          </span>
          <span className="font-medium">{q.nickname}</span>
        </div>
        <span className="text-[10px] text-[--ax-text-muted]">
          {formatTime(q.ts)}
        </span>
      </div>
      <p
        className={
          "mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed " +
          (q.answered ? "text-[--ax-text-muted]" : "text-[--ax-text]")
        }
      >
        {q.text}
      </p>
      <div className="mt-2.5 flex justify-end gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => void wrap(onToggle)}
          className={
            "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors " +
            (q.answered
              ? "border border-[--ax-border] bg-white text-[--ax-text] hover:bg-[--ax-bg]"
              : "bg-[--hyundai-blue] text-white hover:bg-[#001f44]") +
            " disabled:opacity-50"
          }
        >
          {q.answered ? "대기중으로 되돌리기" : "답변완료 처리"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (window.confirm("정말 이 질문을 삭제할까요?")) {
              void wrap(onDelete);
            }
          }}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
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
      <p className="py-6 text-center text-sm text-[--ax-text-muted]">
        불러오는 중...
      </p>
    );
  }

  if (pending.length === 0 && answered.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[--ax-text-muted]">
        등록된 질문이 없습니다.
      </p>
    );
  }

  return (
    <div className="max-h-[70dvh] overflow-y-auto pr-1 ax-scroll">
      <div className="mb-2 flex items-center justify-between text-xs">
        <span className="text-[--ax-text-muted]">
          대기 {pending.length} · 완료 {answered.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2">
        {pending.map((q) => (
          <Row
            key={q.id}
            q={q}
            onToggle={() => markAnswered(q.id, true)}
            onDelete={() => remove(q.id)}
          />
        ))}
        {answered.length > 0 ? (
          <li className="my-2 flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] text-[--ax-text-muted]">
            <span className="h-px flex-1 bg-[--ax-border]" />
            답변완료
            <span className="h-px flex-1 bg-[--ax-border]" />
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
