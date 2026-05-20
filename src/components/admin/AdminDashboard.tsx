"use client";

import { ChatMonitor } from "./ChatMonitor";
import { LogoutButton } from "./LogoutButton";
import { QuestionsAdmin } from "./QuestionsAdmin";
import { ResetButton } from "./ResetButton";
import { StatsPanel } from "./StatsPanel";

type PanelProps = {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
};

function PanelCard({ title, subtitle, badge, children }: PanelProps) {
  return (
    <section className="ax-card flex min-h-0 flex-col overflow-hidden rounded-2xl">
      <header className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-bold tracking-tight text-foreground">
              {title}
            </h2>
            {badge}
          </div>
          {subtitle ? (
            <p className="mt-0.5 text-[11.5px] text-muted">{subtitle}</p>
          ) : null}
        </div>
      </header>
      <div className="ax-scroll flex-1 min-h-0 overflow-y-auto p-4">
        {children}
      </div>
    </section>
  );
}

export function AdminDashboard() {
  return (
    <div className="flex h-full flex-col px-4 py-4 md:px-6 md:py-5">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-hyundai-accent">
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

      <div className="mx-auto mt-4 grid w-full max-w-[1600px] flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-[1fr_1.2fr_1fr]">
        <PanelCard
          title="실시간 채팅"
          subtitle="참가자들의 대화를 실시간으로 모니터링합니다"
        >
          <ChatMonitor />
        </PanelCard>

        <PanelCard
          title="질문"
          subtitle="답변완료 처리 시 참가자 화면에서 하단으로 이동합니다"
        >
          <QuestionsAdmin />
        </PanelCard>

        <PanelCard
          title="현재 상태"
          subtitle="참가자들의 실시간 반응 분포"
        >
          <StatsPanel />
        </PanelCard>
      </div>
    </div>
  );
}
