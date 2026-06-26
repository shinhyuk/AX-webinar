"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import type { Config, Message } from "@/lib/types";

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json();
};

function formatTime(ts: string): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

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
        <QueuePanel />
        <SettingsPanel />
      </main>
    </div>
  );
}

function QueuePanel() {
  const { data, error, isLoading } = useSWR<{ messages: Message[] }>(
    "/api/control/queue",
    fetcher,
    { refreshInterval: 2000, revalidateOnFocus: true },
  );

  const queued = (data?.messages ?? []).filter((m) => m.status === "queued");

  return (
    <section className="ax-card flex min-h-0 flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight">승인 큐</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            분류 통과된 질문이 실시간으로 들어옵니다. 2초마다 갱신
          </p>
        </div>
        <span className="rounded-full bg-accent-dim px-2.5 py-1 text-[11px] font-semibold text-accent">
          {queued.length}건 대기
        </span>
      </header>

      <div className="ax-scroll flex-1 min-h-0 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-sm text-muted">불러오는 중...</p>
        ) : error ? (
          <p className="text-sm text-[color:var(--color-danger)]">
            큐를 불러오지 못했습니다.
          </p>
        ) : queued.length === 0 ? (
          <p className="text-sm text-muted">
            아직 승인 대기 중인 질문이 없어요.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {queued.map((m) => (
              <QueueItem key={m.id} message={m} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function QueueItem({ message }: { message: Message }) {
  return (
    <li className="rounded-2xl border border-line bg-white/[0.03] p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-foreground/85">
          {message.nickname?.trim() || "익명"}
        </span>
        <span className="text-muted/70 tabular-nums">
          {formatTime(message.created_at)}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-[14px] leading-relaxed">
        {message.content}
      </p>
      {message.classification ? (
        <details className="mt-3 text-[11px] text-muted">
          <summary className="cursor-pointer select-none">
            분류 결과 — {message.classification.reason}
          </summary>
          <div className="mt-2 space-y-1 rounded-xl bg-white/[0.02] p-3">
            <div>
              <span className="text-muted/70">정규화된 질문:</span>{" "}
              {message.classification.normalized_question}
            </div>
            <div className="text-muted/70">
              질문={String(message.classification.is_question)} · 주제부합=
              {String(message.classification.on_topic)} · 안전=
              {String(message.classification.safe)}
            </div>
          </div>
        </details>
      ) : null}
      <p className="mt-3 text-[11px] text-muted/70">
        승인/기각 버튼은 M3에서 추가됩니다.
      </p>
    </li>
  );
}

function SettingsPanel() {
  const { data, mutate } = useSWR<{ config: Config }>(
    "/api/control/config",
    fetcher,
  );
  const [pptUrl, setPptUrl] = useState("");
  const [kbText, setKbText] = useState("");
  const [topicDesc, setTopicDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!data?.config || seededRef.current) return;
    seededRef.current = true;
    setPptUrl(data.config.ppt_embed_url ?? "");
    setKbText(data.config.kb_text ?? "");
    setTopicDesc(data.config.topic_desc ?? "");
  }, [data]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/control/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ppt_embed_url: pptUrl.trim() || null,
          kb_text: kbText.trim() || null,
          topic_desc: topicDesc.trim() || null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "저장 실패");
      }
      setSavedAt(new Date().toLocaleTimeString("ko-KR"));
      await mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ax-card flex min-h-0 flex-col overflow-hidden">
      <header className="border-b border-line px-5 py-3">
        <h2 className="text-sm font-bold tracking-tight">행사 설정</h2>
        <p className="mt-0.5 text-[11px] text-muted">
          분류 기준 · 지식 기반 · PPT 임베드 URL
        </p>
      </header>

      <form
        onSubmit={handleSave}
        className="ax-scroll flex-1 min-h-0 space-y-4 overflow-y-auto p-5"
      >
        <div>
          <label className="text-xs font-medium text-muted">
            주제 설명 (분류 기준)
          </label>
          <textarea
            value={topicDesc}
            onChange={(e) => setTopicDesc(e.target.value)}
            rows={3}
            placeholder="예: 현대오토에버 HR-AX 도입 및 인사 AI 활용에 관한 질문"
            className="ax-input ax-scroll mt-1.5 w-full resize-none rounded-xl px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted">
            지식 기반 (KB)
          </label>
          <textarea
            value={kbText}
            onChange={(e) => setKbText(e.target.value)}
            rows={10}
            placeholder="HR-AX 소개, 주요 기능, FAQ 등을 자유 텍스트로 붙여넣으세요. 답변은 이 안에서만 생성됩니다."
            className="ax-input ax-scroll mt-1.5 w-full resize-none rounded-xl px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted">
            PPT 임베드 URL
          </label>
          <input
            type="url"
            value={pptUrl}
            onChange={(e) => setPptUrl(e.target.value)}
            placeholder="OneDrive/SharePoint → 공유 → 임베드의 iframe src"
            className="ax-input mt-1.5 w-full rounded-xl px-3 py-2 text-sm"
          />
          <p className="mt-1.5 text-[11px] text-muted/70">
            웹 뷰어는 일부 애니메이션을 지원하지 않을 수 있습니다. 실제 파일로
            사전 테스트하세요.
          </p>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted/70">
            {error ? (
              <span className="text-[color:var(--color-danger)]">{error}</span>
            ) : savedAt ? (
              <>저장됨 · {savedAt}</>
            ) : null}
          </span>
          <button type="submit" disabled={saving} className="ax-btn px-4 py-2">
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </form>
    </section>
  );
}
