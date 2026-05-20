"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "로그인 실패");
        return;
      }
      const next = params.get("from") ?? "/admin";
      router.replace(next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="ax-card w-full max-w-sm p-7"
    >
      <div className="flex items-center gap-2 text-hyundai-accent">
        <span className="inline-block h-2 w-2 rounded-full bg-hyundai-accent ax-pulse" />
        <span className="text-[11px] font-semibold tracking-[0.22em]">
          HOST CONSOLE
        </span>
      </div>
      <h1 className="mt-2 text-[20px] font-bold text-foreground">
        호스트 로그인
      </h1>
      <p className="mt-1 text-sm text-muted">
        AX 웨비나 진행자 비밀번호를 입력해주세요.
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
        <p className="mt-2 text-sm font-medium text-red-400">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !password}
        className="ax-btn-primary mt-5 w-full rounded-2xl py-3.5 text-[15px] font-bold"
      >
        {pending ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}
