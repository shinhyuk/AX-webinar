"use client";

import {
  STATUS_EMOJI,
  STATUS_KEYS,
  STATUS_LABELS,
  STATUS_COLORS,
  type ReactionCounts,
  type StatusKey,
} from "@/lib/types";

type Props = {
  counts: ReactionCounts;
  total: number;
  mine?: StatusKey | null;
  size?: "sm" | "lg";
};

export function StatusBarChart({ counts, total, mine, size = "sm" }: Props) {
  const barHeight = size === "lg" ? "h-3.5" : "h-2.5";
  return (
    <ul className="flex flex-col gap-3">
      {STATUS_KEYS.map((k) => {
        const n = counts[k];
        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
        const isMine = mine === k;
        return (
          <li key={k}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <span>{STATUS_EMOJI[k]}</span>
                <span>{STATUS_LABELS[k]}</span>
                {isMine ? (
                  <span className="rounded-full bg-[--hyundai-blue] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    내 선택
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums text-[--ax-text-muted]">
                {n}명 · {pct}%
              </span>
            </div>
            <div
              className={
                "mt-1.5 w-full overflow-hidden rounded-full bg-[--ax-bg] " +
                barHeight
              }
            >
              <div
                className="h-full rounded-full transition-[width] duration-300"
                style={{
                  width: `${pct}%`,
                  backgroundColor: STATUS_COLORS[k],
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
