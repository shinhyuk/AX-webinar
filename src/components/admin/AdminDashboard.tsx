"use client";

import { QuestionsAdmin } from "./QuestionsAdmin";
import { StatsPanel } from "./StatsPanel";
import { ResetButton } from "./ResetButton";
import { LogoutButton } from "./LogoutButton";

export function AdminDashboard() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-hyundai">
            HOST CONSOLE
          </p>
          <h1 className="mt-0.5 text-[20px] font-bold tracking-tight text-foreground">
            호스트 대시보드
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ResetButton />
          <LogoutButton />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="ax-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-bold text-foreground">질문 관리</h2>
          </div>
          <p className="mt-0.5 text-xs text-muted">
            답변완료 처리하면 참가자 화면에서 자동으로 하단으로 이동합니다.
          </p>
          <div className="mt-4">
            <QuestionsAdmin />
          </div>
        </section>

        <section className="ax-card p-5">
          <h2 className="text-[15px] font-bold text-foreground">실시간 통계</h2>
          <p className="mt-0.5 text-xs text-muted">
            참가자들의 현재 상태 분포입니다.
          </p>
          <div className="mt-4">
            <StatsPanel />
          </div>
        </section>
      </div>
    </div>
  );
}
