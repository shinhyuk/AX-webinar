"use client";

export function StageScreen() {
  return (
    <div className="grid h-[100dvh] grid-cols-[7fr_3fr] gap-3 bg-background p-3">
      <section className="ax-card flex min-h-0 items-center justify-center overflow-hidden">
        <div className="px-8 text-center text-muted">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-accent">
            PPT EMBED
          </p>
          <p className="mt-2 text-sm">
            /control에서 PPT 임베드 URL을 저장하면 여기에 표시됩니다.
          </p>
        </div>
      </section>

      <section className="ax-card flex min-h-0 flex-col overflow-hidden">
        <header className="border-b border-line px-5 py-3">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-accent">
            LIVE Q&amp;A
          </p>
          <h2 className="mt-0.5 text-lg font-bold tracking-tight">
            라이브 채팅
          </h2>
        </header>
        <div className="ax-scroll flex-1 min-h-0 overflow-y-auto p-4 text-sm text-muted">
          승인된 답변이 여기 표시됩니다 (M4에서 구현).
        </div>
      </section>
    </div>
  );
}
