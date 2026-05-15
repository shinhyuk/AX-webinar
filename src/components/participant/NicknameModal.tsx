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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl bg-white p-6 shadow-2xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1.5rem)" }}
      >
        <h2 className="text-lg font-semibold text-[--hyundai-blue]">
          AX 웨비나에 오신 것을 환영합니다
        </h2>
        <p className="mt-1 text-sm text-[--ax-text-muted]">
          채팅과 질문에 표시될 닉네임을 입력해주세요.
        </p>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(null);
          }}
          placeholder="닉네임 (최대 12자)"
          maxLength={12}
          autoFocus
          className="mt-4 w-full rounded-xl border border-[--ax-border] bg-white px-4 py-3 outline-none focus:border-[--hyundai-blue] focus:ring-2 focus:ring-[--hyundai-blue]/20"
        />
        {error ? (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        ) : null}
        <button
          type="submit"
          className="mt-4 w-full rounded-xl bg-[--hyundai-blue] py-3 font-semibold text-white transition-colors hover:bg-[#001f44] active:bg-[#001a3a]"
        >
          시작하기
        </button>
      </form>
    </div>
  );
}
