"use client";

import { useState } from "react";
import { useReactions } from "@/hooks/useReactions";
import type { Identity } from "@/hooks/useIdentity";
import {
  STATUS_EMOJI,
  STATUS_GRADIENTS,
  STATUS_KEYS,
  STATUS_LABELS,
  type StatusKey,
} from "@/lib/types";
import { StatusBarChart } from "./StatusBarChart";

type Props = {
  identity: Identity;
  active: boolean;
};

export function StatusTab({ identity, active }: Props) {
  const { counts, total, mine, select, loading } = useReactions();
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(s: StatusKey) {
    setError(null);
    try {
      await select(identity.userId, s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "변경 실패");
    }
  }

  return (
    <section
      className={
        "ax-scroll h-full overflow-y-auto px-4 pb-10 pt-4 " +
        (active ? "" : "hidden")
      }
      aria-hidden={!active}
    >
      <div className="ax-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[17px] font-bold tracking-tight text-foreground">
              지금 어떠세요?
            </h2>
            <p className="mt-0.5 text-[13px] text-muted">
              현재 상태를 골라주세요 · 언제든 변경 가능해요
            </p>
          </div>
          {mine ? (
            <span className="rounded-full bg-hyundai-accent/15 px-2.5 py-1 text-[11px] font-semibold text-hyundai-accent ring-1 ring-hyundai-accent/25">
              참여완료
            </span>
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {STATUS_KEYS.map((k) => {
            const isMine = mine === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => void handleSelect(k)}
                aria-pressed={isMine}
                className={
                  "group relative flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl px-3 py-5 text-sm font-bold transition-all active:scale-[0.98] " +
                  (isMine
                    ? "text-white shadow-xl ring-2 ring-white/50"
                    : "ax-btn-glass text-foreground")
                }
                style={isMine ? { backgroundImage: STATUS_GRADIENTS[k] } : undefined}
              >
                <span className="text-3xl leading-none">{STATUS_EMOJI[k]}</span>
                <span className="leading-tight">{STATUS_LABELS[k]}</span>
                {isMine ? (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/25 backdrop-blur">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12l5 5L20 7" />
                    </svg>
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="ax-card mt-3 p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[15px] font-bold tracking-tight text-foreground">
            실시간 현황
          </h3>
          <span className="text-[13px] text-muted">
            총{" "}
            <span className="font-semibold text-foreground tabular-nums">
              {total}
            </span>
            명 참여
          </span>
        </div>
        <div className="mt-4">
          {loading ? (
            <p className="py-6 text-center text-sm text-muted">불러오는 중...</p>
          ) : (
            <StatusBarChart counts={counts} total={total} mine={mine} />
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
