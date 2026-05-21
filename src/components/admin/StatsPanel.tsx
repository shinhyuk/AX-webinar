"use client";

import { useReactions } from "@/hooks/useReactions";
import { StatusBarChart } from "@/components/participant/StatusBarChart";

export function StatsPanel() {
  const { counts, total, loading } = useReactions();

  if (loading) {
    return (
      <p className="py-6 text-center text-sm text-muted">불러오는 중...</p>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 rounded-2xl bg-hyundai-soft px-4 py-2.5">
        <span className="text-base text-muted">참여 인원</span>
        <span className="ml-auto text-3xl font-bold tabular-nums text-hyundai-accent">
          {total}
          <span className="ml-0.5 text-base font-medium">명</span>
        </span>
      </div>
      <div className="mt-4">
        <StatusBarChart counts={counts} total={total} size="lg" />
      </div>
    </div>
  );
}
