"use client";

import { useState } from "react";
import { useReactions } from "@/hooks/useReactions";
import type { Identity } from "@/hooks/useIdentity";
import {
  STATUS_EMOJI,
  STATUS_KEYS,
  STATUS_LABELS,
  STATUS_COLORS,
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
        "ax-scroll h-full overflow-y-auto px-4 pb-8 pt-4 " +
        (active ? "" : "hidden")
      }
      aria-hidden={!active}
    >
      <div className="rounded-2xl bg-white p-4 shadow-sm border border-[--ax-border]">
        <h2 className="text-base font-semibold text-[--ax-text]">
          지금 어떠세요?
        </h2>
        <p className="mt-1 text-sm text-[--ax-text-muted]">
          현재 상태를 골라주세요. 언제든지 바꿀 수 있어요.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {STATUS_KEYS.map((k) => {
            const isMine = mine === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => void handleSelect(k)}
                className={
                  "flex flex-col items-center justify-center gap-1 rounded-2xl border-2 px-3 py-4 text-sm font-semibold transition-all " +
                  (isMine
                    ? "border-transparent text-white shadow-md"
                    : "border-[--ax-border] bg-white text-[--ax-text] hover:border-[--hyundai-blue]/40")
                }
                style={
                  isMine
                    ? { backgroundColor: STATUS_COLORS[k] }
                    : undefined
                }
                aria-pressed={isMine}
              >
                <span className="text-2xl leading-none">{STATUS_EMOJI[k]}</span>
                <span className="leading-tight">{STATUS_LABELS[k]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm border border-[--ax-border]">
        <div className="flex items-baseline justify-between">
          <h3 className="text-base font-semibold text-[--ax-text]">
            실시간 현황
          </h3>
          <span className="text-sm text-[--ax-text-muted]">
            총 {total}명 참여
          </span>
        </div>
        <div className="mt-3">
          {loading ? (
            <p className="py-6 text-center text-sm text-[--ax-text-muted]">
              불러오는 중...
            </p>
          ) : (
            <StatusBarChart counts={counts} total={total} mine={mine} />
          )}
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-600">{error}</p>
      ) : null}
    </section>
  );
}
