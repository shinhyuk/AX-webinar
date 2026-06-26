"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ControlConsole() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/control/logout", { method: "POST" });
      router.replace("/control/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <header className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.22em] text-accent">
            CONTROL CONSOLE
          </p>
          <h1 className="mt-0.5 text-lg font-bold tracking-tight">
            운영자 콘솔
          </h1>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="ax-btn-ghost px-3 py-1.5 text-xs"
        >
          {loggingOut ? "로그아웃 중..." : "로그아웃"}
        </button>
      </header>

      <main className="grid flex-1 grid-cols-1 gap-4 p-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="ax-card flex min-h-0 flex-col overflow-hidden">
          <header className="border-b border-line px-5 py-3">
            <h2 className="text-sm font-bold tracking-tight">승인 큐</h2>
            <p className="mt-0.5 text-[11px] text-muted">
              M2에서 구현 예정 — 분류 통과된 질문이 실시간으로 들어옵니다.
            </p>
          </header>
          <div className="flex-1 p-5 text-sm text-muted">
            아직 큐가 비어 있어요.
          </div>
        </section>

        <section className="ax-card flex min-h-0 flex-col overflow-hidden">
          <header className="border-b border-line px-5 py-3">
            <h2 className="text-sm font-bold tracking-tight">행사 설정</h2>
            <p className="mt-0.5 text-[11px] text-muted">
              M2/M3에서 구현 예정 — PPT 임베드 URL, KB, 주제 설명
            </p>
          </header>
          <div className="flex-1 p-5 text-sm text-muted">
            설정 폼은 다음 마일스톤에서 추가됩니다.
          </div>
        </section>
      </main>
    </div>
  );
}
