"use client";

import { useReactions } from "@/hooks/useReactions";
import { StatusBarChart } from "@/components/participant/StatusBarChart";

export function StatsPanel() {
  const { counts, total, loading } = useReactions();

  if (loading) {
    return (
      <p className="py-6 text-center text-sm text-[--ax-text-muted]">
        불러오는 중...
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-[--ax-text-muted]">
        총 <span className="font-semibold text-[--ax-text]">{total}명</span>이
        현재 상태를 표시했습니다.
      </p>
      <div className="mt-3">
        <StatusBarChart counts={counts} total={total} size="lg" />
      </div>
    </div>
  );
}
