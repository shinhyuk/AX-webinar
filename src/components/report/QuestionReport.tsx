"use client";

import { useEffect, useState } from "react";
import type { FeedMessage } from "@/hooks/useAnsweredMessages";

type Ranked = {
  nickname: string;
  total: number;
  count: number;
  best: number;
};

function rankQuestioners(messages: FeedMessage[]): Ranked[] {
  const byNick = new Map<string, Ranked>();
  for (const m of messages) {
    if (!m.classification?.is_question) continue;
    const score = m.classification.score ?? 0;
    if (score <= 0) continue;
    const nickname = m.nickname?.trim() || "익명";
    const entry = byNick.get(nickname) ?? {
      nickname,
      total: 0,
      count: 0,
      best: 0,
    };
    entry.total += score;
    entry.count += 1;
    entry.best = Math.max(entry.best, score);
    byNick.set(nickname, entry);
  }
  return Array.from(byNick.values()).sort(
    (a, b) => b.total - a.total || b.best - a.best,
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];
const PODIUM_STYLE = [
  "border-yellow-400/40 bg-yellow-400/10 shadow-[0_0_40px_rgba(250,204,21,0.25)]",
  "border-slate-300/40 bg-slate-300/10",
  "border-amber-600/40 bg-amber-600/10",
];

export function QuestionReport() {
  const [messages, setMessages] = useState<FeedMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public/messages", { cache: "no-store" });
        if (!res.ok) throw new Error("불러오기 실패");
        const json = (await res.json()) as { messages: FeedMessage[] };
        if (!cancelled) setMessages(json.messages ?? []);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "불러오기 실패");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <p className="text-[color:var(--color-danger)]">{error}</p>
      </div>
    );
  }
  if (!messages) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <p className="text-muted">집계 중...</p>
      </div>
    );
  }

  const questions = messages
    .filter((m) => m.classification?.is_question)
    .sort(
      (a, b) =>
        (b.classification?.score ?? 0) - (a.classification?.score ?? 0),
    );
  const ranked = rankQuestioners(messages);
  const podium = ranked.slice(0, 3);

  return (
    <div className="min-h-[100dvh] bg-background px-6 py-10">
      <div className="mx-auto w-full max-w-4xl">
        {/* 헤더 */}
        <header className="text-center">
          <p className="text-[12px] font-semibold tracking-[0.3em] text-accent">
            HYUNDAI AUTOEVER · 한국 HRD 포럼
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            🏆 질문 시상식
          </h1>
          <p className="mt-2 text-muted">
            총 질문 {questions.length}건 · 참여 {ranked.length}명
          </p>
        </header>

        {/* 포디움 TOP 3 */}
        {podium.length > 0 ? (
          <section className="mt-10">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {podium.map((p, i) => (
                <div
                  key={p.nickname}
                  className={
                    "ax-fade-in rounded-3xl border p-6 text-center " +
                    PODIUM_STYLE[i] +
                    (i === 0 ? " sm:order-2 sm:-translate-y-3" : "") +
                    (i === 1 ? " sm:order-1" : "") +
                    (i === 2 ? " sm:order-3" : "")
                  }
                >
                  <div className="text-5xl">{MEDALS[i]}</div>
                  <div className="mt-3 text-2xl font-bold">{p.nickname}</div>
                  <div className="mt-1 text-sm text-muted">
                    질문 {p.count}건 · 최고 {p.best}점
                  </div>
                  <div className="mt-3 text-4xl font-bold tabular-nums text-accent">
                    {p.total}
                    <span className="ml-1 text-lg font-medium">점</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <p className="mt-10 text-center text-muted">
            아직 채점된 질문이 없습니다.
          </p>
        )}

        {/* 전체 질문 목록 (점수순) */}
        {questions.length > 0 ? (
          <section className="mt-12">
            <h2 className="text-xl font-bold tracking-tight">
              전체 질문 <span className="text-muted">— 점수순</span>
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
              {questions.map((q, i) => (
                <li key={q.id} className="ax-card p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-muted/70">
                        #{i + 1}
                      </span>
                      <span className="font-semibold">
                        {q.nickname?.trim() || "익명"}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-full bg-accent-dim px-3 py-1 text-sm font-bold tabular-nums text-accent">
                      {q.classification?.score ?? 0}점
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-[17px] leading-relaxed">
                    {q.content}
                  </p>
                  {q.answer ? (
                    <div className="mt-3 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
                      <p className="text-[11px] font-semibold tracking-[0.15em] text-accent">
                        HR-AX 답변
                      </p>
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
                        {q.answer}
                      </p>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <footer className="mt-14 pb-6 text-center text-[12px] text-muted/60">
          HR AX추진TFT · HYUNDAI AUTOEVER
        </footer>
      </div>
    </div>
  );
}
