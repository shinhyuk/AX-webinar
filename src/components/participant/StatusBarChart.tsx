"use client";

import {
  STATUS_EMOJI,
  STATUS_GRADIENTS,
  STATUS_KEYS,
  STATUS_LABELS,
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
  const lg = size === "lg";
  const barHeight = lg ? "h-6" : "h-2.5";
  return (
    <ul className={"flex flex-col " + (lg ? "gap-5" : "gap-3.5")}>
      {STATUS_KEYS.map((k) => {
        const n = counts[k];
        const pct = total > 0 ? Math.round((n / total) * 100) : 0;
        const isMine = mine === k;
        return (
          <li key={k}>
            <div
              className={
                "flex items-center justify-between " +
                (lg ? "text-[28px]" : "text-[13px]")
              }
            >
              <span className="flex items-center gap-2">
                <span className={lg ? "text-4xl" : "text-base"}>
                  {STATUS_EMOJI[k]}
                </span>
                <span className="font-medium text-foreground">
                  {STATUS_LABELS[k]}
                </span>
                {isMine ? (
                  <span className="rounded-full bg-hyundai px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    내 선택
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums text-muted">
                <span className="font-bold text-foreground">{pct}%</span>
                <span className={"ml-1 " + (lg ? "text-[20px]" : "text-[11px]")}>
                  · {n}명
                </span>
              </span>
            </div>
            <div
              className={
                "mt-1.5 w-full overflow-hidden rounded-full bg-white/8 " +
                barHeight
              }
            >
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundImage: STATUS_GRADIENTS[k],
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
