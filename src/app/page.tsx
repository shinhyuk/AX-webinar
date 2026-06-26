"use client";

import { useState } from "react";

const MAX_LEN = 300;

export default function AudiencePage() {
  const [nickname, setNickname] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setError(null);
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      setError("질문을 입력해주세요.");
      return;
    }
    if (trimmed.length > MAX_LEN) {
      setError(`질문은 ${MAX_LEN}자 이하로 입력해주세요.`);
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          nickname: nickname.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "전송에 실패했어요.");
      }
      setContent("");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "전송에 실패했어요.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-background px-5 py-8"
      style={{
        paddingTop: "calc(env(safe-area-inset-top) + 2rem)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)",
      }}
    >
      <header className="mx-auto w-full max-w-md">
        <p className="text-[11px] font-semibold tracking-[0.22em] text-accent">
          HYUNDAI AUTOEVER · HR-AX
        </p>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight">
          라이브 세미나 Q&amp;A
        </h1>
        <p className="mt-1 text-sm text-muted">
          궁금한 점을 남겨주세요. 화면에 답변이 표시됩니다.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="ax-card ax-fade-in mx-auto mt-6 w-full max-w-md p-5"
      >
        <label className="block text-xs font-medium text-muted">
          닉네임 <span className="text-muted/60">(선택)</span>
        </label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="예: 민지"
          maxLength={12}
          className="ax-input mt-1.5 w-full rounded-2xl px-4 py-3"
        />

        <label className="mt-4 block text-xs font-medium text-muted">
          질문
        </label>
        <textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            if (sent) setSent(false);
            if (error) setError(null);
          }}
          placeholder="HR-AX에 대해 궁금한 점을 자유롭게 남겨주세요"
          rows={5}
          maxLength={MAX_LEN}
          className="ax-input ax-scroll mt-1.5 w-full resize-none rounded-2xl px-4 py-3 leading-relaxed"
        />
        <div className="mt-1 flex items-center justify-between text-[11px]">
          {error ? (
            <span className="text-[color:var(--color-danger)]">{error}</span>
          ) : sent ? (
            <span className="text-accent">
              질문이 전달됐어요. 화면에서 답변을 확인하세요.
            </span>
          ) : (
            <span className="text-muted/70">
              승인된 질문만 화면에 노출됩니다.
            </span>
          )}
          <span className="text-muted/70 tabular-nums">
            {content.length}/{MAX_LEN}
          </span>
        </div>

        <button
          type="submit"
          disabled={sending || content.trim().length === 0}
          className="ax-btn mt-5 w-full py-4 text-[15px]"
        >
          {sending ? "전송 중..." : "질문 보내기"}
        </button>
      </form>

      <footer className="mx-auto mt-auto w-full max-w-md pt-8 text-center text-[11px] text-muted/60">
        HR AX추진TFT · HYUNDAI AUTOEVER
      </footer>
    </div>
  );
}
