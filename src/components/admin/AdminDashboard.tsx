"use client";

import { QuestionsAdmin } from "./QuestionsAdmin";
import { StatsPanel } from "./StatsPanel";
import { ResetButton } from "./ResetButton";
import { LogoutButton } from "./LogoutButton";

export function AdminDashboard() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[--ax-text]">호스트 대시보드</h1>
        <div className="flex items-center gap-2">
          <ResetButton />
          <LogoutButton />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-[--ax-border] bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">질문 관리</h2>
          <p className="mt-0.5 text-xs text-[--ax-text-muted]">
            답변완료 처리하면 참가자 화면에서 자동으로 하단으로 이동합니다.
          </p>
          <div className="mt-3">
            <QuestionsAdmin />
          </div>
        </section>

        <section className="rounded-2xl border border-[--ax-border] bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">실시간 통계</h2>
          <p className="mt-0.5 text-xs text-[--ax-text-muted]">
            참가자들의 현재 상태 분포입니다.
          </p>
          <div className="mt-3">
            <StatsPanel />
          </div>
        </section>
      </div>
    </div>
  );
}
