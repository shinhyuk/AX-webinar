"use client";

import { useState } from "react";

type Props = {
  onSubmit: (nickname: string) => void;
};

export function NicknameModal({ onSubmit }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setError("닉네임을 입력해주세요.");
      return;
    }
    if (trimmed.length > 12) {
      setError("12자 이하로 입력해주세요.");
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="ax-glass-strong ax-fade-in w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-7 pb-6 shadow-2xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
        <div className="flex items-center gap-2 text-hyundai-accent">
          <span className="inline-block h-2 w-2 rounded-full bg-hyundai-accent ax-pulse" />
          <span className="text-[11px] font-semibold tracking-[0.18em]">
            AX 웨비나 참여
          </span>
        </div>
        <h2 className="mt-2 text-[20px] font-bold leading-snug text-foreground">
          환영합니다 👋
          <br />
          닉네임을 입력해주세요
        </h2>
        <p className="mt-1.5 text-sm text-muted">
          채팅과 질문에 표시될 이름이에요. 언제든 다시 시작할 수 있어요.
        </p>
        <div className="mt-5">
          <label className="text-xs font-medium text-muted">닉네임</label>
          <input
            type="text"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (error) setError(null);
            }}
            placeholder="예: 민지"
            maxLength={12}
            autoFocus
            className="ax-input mt-1.5 w-full rounded-2xl px-4 py-3.5"
          />
          <div className="mt-1 flex items-center justify-between text-[11px]">
            {error ? (
              <span className="text-red-400">{error}</span>
            ) : (
              <span className="text-muted/70">한글, 영문, 숫자 모두 가능</span>
            )}
            <span className="text-muted/70 tabular-nums">
              {value.length}/12
            </span>
          </div>
        </div>
        <button
          type="submit"
          className="ax-btn-primary mt-6 w-full rounded-2xl py-4 text-[15px] font-bold"
        >
          시작하기
        </button>
      </form>
    </div>
  );
}
