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

function QuestionCard({
  q,
  mine,
}: {
  q: Question;
  mine: boolean;
}) {
  return (
    <article
      className={
        "rounded-2xl border px-4 py-3 transition-colors " +
        (q.answered
          ? "border-[--ax-border] bg-[--ax-bg]/60 text-[--ax-text-muted]"
          : "border-[--ax-border] bg-white text-[--ax-text]")
      }
    >
      <header className="flex items-center justify-between text-xs">
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
          <span className="font-medium">
            {mine ? "나" : q.nickname}
          </span>
        </div>
        <span className="text-[10px] text-[--ax-text-muted]">
          {formatTime(q.ts)}
        </span>
      </header>
      <p
        className={
          "mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed " +
          (q.answered ? "line-through decoration-[--ax-border]" : "")
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
      <div className="flex flex-1 items-center justify-center text-sm text-[--ax-text-muted]">
        불러오는 중...
      </div>
    );
  }

  if (pending.length === 0 && answered.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-[--ax-text-muted]">
        아직 등록된 질문이 없어요.
        <br />첫 질문을 남겨보세요!
      </div>
    );
  }

  return (
    <div className="ax-scroll flex-1 overflow-y-auto px-3 py-3">
      <div className="flex flex-col gap-2">
        {pending.map((q) => (
          <QuestionCard key={q.id} q={q} mine={q.userId === myUserId} />
        ))}
        {answered.length > 0 ? (
          <div className="mt-4 mb-1 flex items-center gap-2">
            <span className="h-px flex-1 bg-[--ax-border]" />
            <span className="text-[10px] font-semibold tracking-[0.18em] text-[--ax-text-muted]">
              답변완료 {answered.length}
            </span>
            <span className="h-px flex-1 bg-[--ax-border]" />
          </div>
        ) : null}
        {answered.map((q) => (
          <QuestionCard key={q.id} q={q} mine={q.userId === myUserId} />
        ))}
      </div>
    </div>
  );
}
