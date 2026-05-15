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
      className="w-full max-w-sm rounded-2xl border border-[--ax-border] bg-white p-6 shadow-sm"
    >
      <h1 className="text-lg font-semibold text-[--hyundai-blue]">
        호스트 로그인
      </h1>
      <p className="mt-1 text-sm text-[--ax-text-muted]">
        AX 웨비나 진행자 비밀번호를 입력해주세요.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        autoFocus
        className="mt-4 w-full rounded-xl border border-[--ax-border] bg-white px-4 py-3 outline-none focus:border-[--hyundai-blue] focus:ring-2 focus:ring-[--hyundai-blue]/20"
      />
      {error ? (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending || !password}
        className="mt-4 w-full rounded-xl bg-[--hyundai-blue] py-3 font-semibold text-white transition-colors hover:bg-[#001f44] disabled:bg-[--hyundai-silver]"
      >
        {pending ? "확인 중..." : "로그인"}
      </button>
    </form>
  );
}
