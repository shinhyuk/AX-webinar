"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import type { AnswerModel, Config, Message } from "@/lib/types";

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

      <main className="grid flex-1 grid-cols-1 gap-4 p-6 lg:grid-cols-[1fr_1.2fr]">
        <SettingsPanel />
        <MessagesPanel />
      </main>
    </div>
  );
}

function SettingsPanel() {
  const { data, mutate } = useSWR<{ config: Config }>(
    "/api/control/config",
    fetcher,
  );
  const [kbText, setKbText] = useState("");
  const [topicDesc, setTopicDesc] = useState("");
  const [pptUrl, setPptUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const seededRef = useRef(false);

  useEffect(() => {
    if (!data?.config || seededRef.current) return;
    seededRef.current = true;
    setKbText(data.config.kb_text ?? "");
    setTopicDesc(data.config.topic_desc ?? "");
    setPptUrl(data.config.ppt_embed_url ?? "");
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

  async function handlePptUpload(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/control/upload-ppt", {
        method: "POST",
        body: form,
      });
      const j = (await res.json().catch(() => ({}))) as {
        embedUrl?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "업로드 실패");
      if (j.embedUrl) setPptUrl(j.embedUrl);
      await mutate();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <section className="ax-card flex min-h-0 flex-col overflow-hidden">
      <header className="border-b border-line px-5 py-3">
        <h2 className="text-sm font-bold tracking-tight">
          지식 관리 · PPT 업로드
        </h2>
      </header>

      <form
        onSubmit={handleSave}
        className="ax-scroll flex-1 min-h-0 space-y-4 overflow-y-auto p-5"
      >
        <div>
          <label className="text-xs font-medium text-muted">
            지식 기반 (KB)
          </label>
          <p className="mt-0.5 text-[11px] text-muted/70">
            답변은 이 안의 내용에서만 생성됩니다.
          </p>
          <textarea
            value={kbText}
            onChange={(e) => setKbText(e.target.value)}
            rows={12}
            placeholder="HR-AX 소개, 주요 기능, FAQ 등을 자유 텍스트로 붙여넣으세요."
            className="ax-input ax-scroll mt-1.5 w-full resize-none rounded-xl px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted">
            주제 설명 (선택)
          </label>
          <textarea
            value={topicDesc}
            onChange={(e) => setTopicDesc(e.target.value)}
            rows={2}
            placeholder="예: 현대오토에버 HR-AX 도입 및 인사 AI 활용"
            className="ax-input ax-scroll mt-1.5 w-full resize-none rounded-xl px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <label className="text-xs font-medium text-muted">
            PPT 업로드 (.pptx / .ppt)
          </label>
          <p className="mt-0.5 text-[11px] text-muted/70">
            업로드하면 Microsoft Office Online 뷰어로 자동 임베드됩니다. 애니메이션 그대로 보존.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pptx,.ppt"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handlePptUpload(f);
              }}
              className="block w-full text-xs text-foreground/80 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent-dim file:px-3 file:py-1.5 file:text-[12px] file:font-semibold file:text-accent hover:file:brightness-110"
            />
          </div>
          {uploading ? (
            <p className="mt-2 text-[11px] text-accent">업로드 중...</p>
          ) : null}
          {uploadError ? (
            <p className="mt-2 text-[11px] text-[color:var(--color-danger)]">
              {uploadError}
            </p>
          ) : null}
          {pptUrl ? (
            <details className="mt-2 text-[11px] text-muted">
              <summary className="cursor-pointer select-none">
                현재 임베드 URL 보기
              </summary>
              <p className="mt-1 whitespace-pre-wrap break-all rounded-lg bg-white/[0.03] p-2 text-foreground/70">
                {pptUrl}
              </p>
            </details>
          ) : null}
        </div>

        <div>
          <label className="text-xs font-medium text-muted">
            또는 임베드 URL 직접 입력
          </label>
          <input
            type="url"
            value={pptUrl}
            onChange={(e) => setPptUrl(e.target.value)}
            placeholder="OneDrive/SharePoint 임베드 URL"
            className="ax-input mt-1.5 w-full rounded-xl px-3 py-2 text-sm"
          />
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
            {saving ? "저장 중..." : "설정 저장"}
          </button>
        </div>
      </form>
    </section>
  );
}

function MessagesPanel() {
  const { data, error, isLoading, mutate } = useSWR<{ messages: Message[] }>(
    "/api/control/queue",
    fetcher,
    { refreshInterval: 3000 },
  );
  const model: AnswerModel = "opus";

  const messages = (data?.messages ?? []).slice().reverse();
  const answered = messages.filter((m) => m.answer).length;

  return (
    <section className="ax-card flex min-h-0 flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
        <div>
          <h2 className="text-sm font-bold tracking-tight">실시간 채팅</h2>
          <p className="mt-0.5 text-[11px] text-muted">
            질문은 자동으로 Opus 4.8이 답변합니다 · 필요 시 [재생성]
          </p>
        </div>
        <span className="rounded-full bg-accent-dim px-2.5 py-1 text-[11px] font-semibold text-accent">
          {answered}건 답변
        </span>
      </header>

      <div className="ax-scroll flex-1 min-h-0 overflow-y-auto p-4">
        {isLoading ? (
          <p className="text-sm text-muted">불러오는 중...</p>
        ) : error ? (
          <p className="text-sm text-[color:var(--color-danger)]">
            불러오지 못했습니다.
          </p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted">아직 메시지가 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((m) => (
              <MessageRow
                key={m.id}
                message={m}
                model={model}
                onAnswered={() => mutate()}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function MessageRow({
  message,
  model,
  onAnswered,
}: {
  message: Message;
  model: AnswerModel;
  onAnswered: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasAnswer = !!message.answer;

  async function handleAnswer() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/control/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: message.id, model }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "답변 생성 실패");
      onAnswered();
    } catch (e) {
      setError(e instanceof Error ? e.message : "답변 생성 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-2xl border border-line bg-white/[0.03] p-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="font-semibold text-foreground/85">
            {message.nickname?.trim() || "익명"}
          </span>
          {message.classification?.is_question ? (
            <span className="rounded-full bg-accent-dim px-1.5 py-px text-[10px] font-bold text-accent">
              질문
            </span>
          ) : null}
        </span>
        <span className="tabular-nums text-muted/70">
          {formatTime(message.created_at)}
        </span>
      </div>
      <p className="mt-1.5 whitespace-pre-wrap break-words text-[13px] leading-relaxed">
        {message.content}
      </p>

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted/70">
          {hasAnswer ? (
            <span className="text-accent">답변 완료</span>
          ) : message.classification?.is_question ? (
            <span className="text-accent/70">답변 생성 대기 중...</span>
          ) : (
            <span>일반 채팅</span>
          )}
          {message.model ? (
            <span className="ml-2 text-muted/50">· {message.model}</span>
          ) : null}
        </span>
        <button
          type="button"
          onClick={handleAnswer}
          disabled={busy}
          className="ax-btn-ghost px-3 py-1 text-[11px]"
        >
          {busy ? "생성 중..." : hasAnswer ? "재생성" : "수동 답변"}
        </button>
      </div>

      {hasAnswer ? (
        <div className="mt-2.5 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-2.5">
          <p className="text-[11px] font-semibold text-accent">HR-AX 답변</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed">
            {message.answer}
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-[11px] text-[color:var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </li>
  );
}
