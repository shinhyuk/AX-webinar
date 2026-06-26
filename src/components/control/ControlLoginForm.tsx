"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function ControlLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/control/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "로그인 실패");
        return;
      }
      const next = params.get("from") ?? "/control";
      router.replace(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="ax-card w-full max-w-sm p-7">
      <div className="flex items-center gap-2 text-accent">
        <span className="inline-block h-2 w-2 rounded-full bg-accent" />
        <span className="text-[11px] font-semibold tracking-[0.22em]">
          CONTROL CONSOLE
        </span>
      </div>
      <h1 className="mt-2 text-[20px] font-bold">운영자 로그인</h1>
      <p className="mt-1 text-sm text-muted">
        HR-AX 라이브 세미나 운영자 비밀번호를 입력해주세요.
      </p>
      <div className="mt-5">
        <label className="text-xs font-medium text-muted">비밀번호</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoFocus
          className="ax-input mt-1.5 w-full rounded-2xl px-4 py-3.5"
        />
      </div>
      {error ? (
        <p className="mt-2 text-sm font-medium text-[color:var(--color-danger)]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !password}
        className="ax-btn mt-5 w-full py-3.5 text-[15px]"
      >
        {pending ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}
