"use client";

import { useState } from "react";

export function ResetButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    const sure = window.confirm(
      "채팅, 질문, 현재상태 데이터를 모두 삭제할까요?\n되돌릴 수 없습니다.",
    );
    if (!sure) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "초기화 실패");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleReset()}
        className="rounded-xl border border-red-200 bg-surface px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-50 active:scale-95 disabled:opacity-50"
      >
        {busy ? "초기화 중..." : "전체 초기화"}
      </button>
      {error ? (
        <p className="mt-1 text-[11px] text-red-600">{error}</p>
      ) : null}
    </div>
  );
}
