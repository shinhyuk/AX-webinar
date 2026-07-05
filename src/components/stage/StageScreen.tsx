"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { QRCodeSVG } from "qrcode.react";
import {
  useAnsweredMessages,
  type FeedMessage,
} from "@/hooks/useAnsweredMessages";
import { useOnlineCount } from "@/hooks/useOnlineCount";

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  return res.json();
};

const QR_URL = "https://hrax.app";

/* ── 데모 시나리오 스크립트 ─────────────────────────────── */

type TheaterStep =
  | { kind: "chat"; who: "host" | "shin"; text: string }
  | { kind: "loading" }
  | { kind: "transform" }
  | { kind: "qr-corner" };

const THEATER_SCRIPT: TheaterStep[] = [
  { kind: "chat", who: "host", text: "신혁쌤, HRD 발표자료 준비해주세요." },
  {
    kind: "chat",
    who: "shin",
    text: "AI 시대에 맞게, 프롬프팅 방식으로 해보겠습니다.",
  },
  {
    kind: "chat",
    who: "shin",
    text: "H Chat! 세상에 없던 발표 형식과 자료 만들어줘!",
  },
  { kind: "loading" },
  { kind: "transform" }, // 변신과 동시에 QR 크게 표시
  { kind: "qr-corner" }, // QR을 구석으로 — 이후 채팅창 유지
];

type TheaterState = {
  introLines: Array<{ who: "host" | "shin"; text: string }>;
  loading: boolean;
  transformed: boolean;
  qr: "hidden" | "big" | "corner";
};

function deriveTheater(count: number): TheaterState {
  const s: TheaterState = {
    introLines: [],
    loading: false,
    transformed: false,
    qr: "hidden",
  };
  for (let i = 0; i < Math.min(count, THEATER_SCRIPT.length); i++) {
    const step = THEATER_SCRIPT[i];
    switch (step.kind) {
      case "chat":
        s.introLines.push({ who: step.who, text: step.text });
        s.loading = false;
        break;
      case "loading":
        s.loading = true;
        break;
      case "transform":
        s.transformed = true;
        s.loading = false;
        s.qr = "big";
        break;
      case "qr-corner":
        s.qr = "corner";
        break;
    }
  }
  return s;
}

/* ── 타자 효과음 (Web Audio 합성, 음원 파일 불필요) ────── */

let typingAudioCtx: AudioContext | null = null;

function playKeySound() {
  try {
    if (typeof window === "undefined") return;
    if (!typingAudioCtx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      typingAudioCtx = new Ctor();
    }
    const ctx = typingAudioCtx;
    if (ctx.state === "suspended") void ctx.resume();

    // 짧은 노이즈 버스트 → 밴드패스 → 감쇠 = 기계식 키보드 틱 소리
    const dur = 0.035;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1800 + Math.random() * 1600;
    band.Q.value = 1.2;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(band);
    band.connect(gain);
    gain.connect(ctx.destination);
    src.start(t);
    src.stop(t + dur);
  } catch {
    // 오디오 미지원/차단 환경에서는 조용히 무시
  }
}

/* ── 메인 컴포넌트 ─────────────────────────────────────── */

export function StageScreen({ demo = false }: { demo?: boolean }) {
  const { data: cfg } = useSWR<{ ppt_embed_url: string | null }>(
    "/api/public/config",
    fetcher,
    { refreshInterval: 30000 },
  );
  const { messages, loading } = useAnsweredMessages();
  const [typedIds, setTypedIds] = useState<Set<string>>(new Set());
  const endRef = useRef<HTMLDivElement | null>(null);
  const initialIdsRef = useRef<Set<string> | null>(null);

  // 시나리오 상태
  const [stepIndex, setStepIndex] = useState(0);
  const [transforming, setTransforming] = useState(false);
  const [exited, setExited] = useState(!demo);

  const t = deriveTheater(exited ? THEATER_SCRIPT.length : stepIndex);
  const transformed = exited || t.transformed;
  const qrState: "hidden" | "big" | "corner" = exited
    ? demo
      ? "corner"
      : "hidden"
    : t.qr;

  const advance = useCallback(() => {
    setStepIndex((i) => {
      if (i >= THEATER_SCRIPT.length) return i;
      const step = THEATER_SCRIPT[i];
      if (step.kind === "transform") {
        setTransforming(true);
        window.setTimeout(() => setTransforming(false), 1300);
      }
      return i + 1;
    });
  }, []);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
    setTransforming(false);
  }, []);

  useEffect(() => {
    if (!demo) return;
    const onKey = (e: KeyboardEvent) => {
      // 수정키 단독 입력은 무시
      if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key))
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      } else if (e.key === "0") {
        setExited(true);
        setTransforming(false);
      } else {
        // 아무 키나 누르면 다음 장면으로
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [demo, advance, back]);

  useEffect(() => {
    if (initialIdsRef.current !== null) return;
    if (loading) return;
    initialIdsRef.current = new Set(
      messages.filter((m) => m.answer).map((m) => m.id),
    );
    setTypedIds(new Set(initialIdsRef.current));
  }, [loading, messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const showIntro = demo && !exited && (!transformed || transforming);
  const justRevealed = demo && !exited && transformed && !transforming;

  if (showIntro) {
    return (
      <IntroChat
        lines={t.introLines}
        loading={t.loading}
        glitching={transforming}
        onAdvance={advance}
      />
    );
  }

  return (
    <div className="relative h-[100dvh] bg-background p-3">
      {justRevealed ? (
        <div className="ax-flash pointer-events-none absolute inset-0 z-50 bg-white" />
      ) : null}

      <div className="grid h-full grid-cols-[7fr_3fr] gap-3">
        <div className={justRevealed ? "ax-slide-in-left min-h-0" : "min-h-0"}>
          <PptPanel url={cfg?.ppt_embed_url ?? null} />
        </div>

        <section
          className={
            "ax-card flex min-h-0 flex-col overflow-hidden " +
            (justRevealed ? "ax-slide-in-right" : "")
          }
        >
            <header className="flex items-start justify-between border-b border-line px-5 py-3">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.22em] text-accent">
                  LIVE CHAT
                </p>
                <h2 className="mt-0.5 text-xl font-bold tracking-tight">
                  실시간 채팅
                </h2>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <OnlineBadge />
                <a
                  href="/report"
                  className="ax-btn-ghost rounded-xl px-3 py-1.5 text-[12px] font-semibold"
                >
                  질문 보고서
                </a>
              </div>
            </header>
            <TopQuestions messages={messages} />
            <div className="ax-scroll flex-1 min-h-0 overflow-y-auto px-4 py-4">
              {loading ? (
                <p className="text-base text-muted">불러오는 중...</p>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-center text-base text-muted">
                    청중 메시지가 여기 표시됩니다
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-4">
                  {messages.map((m) => (
                    <StageItem
                      key={m.id}
                      message={m}
                      alreadyTyped={!!m.answer && typedIds.has(m.id)}
                      onTyped={() =>
                        setTypedIds((prev) => {
                          if (prev.has(m.id)) return prev;
                          const next = new Set(prev);
                          next.add(m.id);
                          return next;
                        })
                      }
                    />
                  ))}
                </ul>
              )}
              <div ref={endRef} />
            </div>
          </section>
      </div>

      {/* QR 오버레이 */}
      {qrState === "big" ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="ax-pop-in flex flex-col items-center rounded-3xl bg-white px-10 py-8 shadow-2xl">
            <p className="text-[13px] font-bold tracking-[0.2em] text-slate-500">
              지금 접속하세요
            </p>
            <div className="mt-4">
              <QRCodeSVG value={QR_URL} size={280} />
            </div>
            <p className="mt-4 text-2xl font-bold text-slate-900">hrax.app</p>
            <p className="mt-1 text-sm text-slate-500">
              질문과 반응을 실시간으로 남길 수 있어요
            </p>
          </div>
        </div>
      ) : null}
      {qrState === "corner" ? (
        <div className="ax-pop-in absolute bottom-6 left-6 z-30 flex flex-col items-center rounded-2xl bg-white p-3 shadow-xl">
          <QRCodeSVG value={QR_URL} size={96} />
          <p className="mt-1.5 text-[11px] font-bold text-slate-700">
            hrax.app
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ── Scene 0: H Chat 오프닝 화면 ───────────────────────── */

function IntroChat({
  lines,
  loading,
  glitching,
  onAdvance,
}: {
  lines: Array<{ who: "host" | "shin"; text: string }>;
  loading: boolean;
  glitching: boolean;
  onAdvance: () => void;
}) {
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length, loading]);

  return (
    <div
      onClick={onAdvance}
      className={
        "flex h-[100dvh] cursor-pointer flex-col bg-background " +
        (glitching ? "ax-glitch-out" : "")
      }
    >
      <header className="flex items-center gap-3 border-b border-line px-6 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-purple-500 text-sm font-bold text-white">
          H
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">H Chat</h1>
          <p className="text-[11px] text-muted">
            HYUNDAI AUTOEVER · AI Assistant
          </p>
        </div>
      </header>

      <div className="ax-scroll mx-auto w-full max-w-3xl flex-1 overflow-y-auto px-6 py-8">
        <ul className="flex flex-col gap-5">
          {lines.map((l, i) => (
            <li
              key={i}
              className={
                "ax-fade-in flex " +
                (l.who === "shin" ? "justify-end" : "justify-start")
              }
            >
              <div
                className={
                  "max-w-[80%] " + (l.who === "shin" ? "text-right" : "")
                }
              >
                <p className="mb-1 px-1 text-[13px] text-muted">
                  {l.who === "shin" ? "신혁쌤" : "사회자"}
                </p>
                <p
                  className={
                    "whitespace-pre-wrap rounded-3xl px-5 py-3.5 text-left text-[22px] leading-snug " +
                    (l.who === "shin"
                      ? "rounded-tr-lg bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/25"
                      : "rounded-tl-lg border border-white/10 bg-white/[0.06]")
                  }
                >
                  {i === lines.length - 1 && !loading ? (
                    <IntroTypewriter text={l.text} />
                  ) : (
                    l.text
                  )}
                </p>
              </div>
            </li>
          ))}
          {loading ? (
            <li className="ax-fade-in flex justify-start">
              <div>
                <p className="mb-1 px-1 text-[13px] font-semibold text-accent">
                  H Chat
                </p>
                <p className="inline-flex items-center gap-1.5 rounded-3xl rounded-tl-lg border border-cyan-400/20 bg-cyan-400/5 px-6 py-4">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-accent"
                    style={{ animationDelay: "140ms" }}
                  />
                  <span
                    className="h-2 w-2 animate-bounce rounded-full bg-accent"
                    style={{ animationDelay: "280ms" }}
                  />
                </p>
              </div>
            </li>
          ) : null}
        </ul>
        <div ref={endRef} />
      </div>
    </div>
  );
}

function IntroTypewriter({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (text[i - 1] !== " ") playKeySound();
      if (i >= text.length) window.clearInterval(id);
    }, 34);
    return () => window.clearInterval(id);
  }, [text]);
  return (
    <>
      {shown}
      {shown.length < text.length ? (
        <span className="ax-caret" aria-hidden />
      ) : null}
    </>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

function TopQuestions({ messages }: { messages: FeedMessage[] }) {
  const top = messages
    .filter(
      (m) => m.classification?.is_question && (m.classification.score ?? 0) > 0,
    )
    .sort(
      (a, b) =>
        (b.classification?.score ?? 0) - (a.classification?.score ?? 0),
    )
    .slice(0, 3);
  if (top.length === 0) return null;
  return (
    <div className="shrink-0 border-b border-line bg-white/[0.02] px-4 py-2">
      <p className="mb-1 text-[10px] font-semibold tracking-[0.2em] text-accent">
        현재 질문 순위
      </p>
      <ol className="flex flex-col gap-0.5">
        {top.map((q, i) => (
          <li key={q.id} className="flex items-center gap-1.5 text-[13px]">
            <span className="shrink-0">{MEDALS[i]}</span>
            <span className="shrink-0 font-bold tabular-nums text-accent">
              {q.classification?.score}점
            </span>
            <span className="shrink-0 font-medium text-foreground/85">
              {q.nickname?.trim() || "익명"}
            </span>
            <span className="truncate text-muted">{q.content}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function OnlineBadge() {
  const online = useOnlineCount(false);
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-accent-dim px-3 py-1.5 text-[14px] font-bold tabular-nums text-accent">
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      {online}명 접속
    </span>
  );
}

function colorFromKey(key: string): string {
  const palette = [
    "#38bdf8",
    "#34d399",
    "#fbbf24",
    "#fb7185",
    "#c084fc",
    "#22d3ee",
    "#f472b6",
    "#2dd4bf",
  ];
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return palette[Math.abs(hash) % palette.length];
}

function PptPanel({ url }: { url: string | null }) {
  if (!url) {
    return (
      <section className="ax-card flex h-full min-h-0 items-center justify-center overflow-hidden">
        <div className="px-8 text-center text-muted">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-accent">
            PPT EMBED
          </p>
          <p className="mt-2 text-base">
            /control에서 PPT를 업로드하면 여기에 표시됩니다.
          </p>
        </div>
      </section>
    );
  }
  return (
    <section className="ax-card h-full overflow-hidden">
      <iframe
        src={url}
        className="h-full w-full"
        frameBorder={0}
        allow="fullscreen"
        title="presentation"
      />
    </section>
  );
}

function StageItem({
  message,
  alreadyTyped,
  onTyped,
}: {
  message: FeedMessage;
  alreadyTyped: boolean;
  onTyped: () => void;
}) {
  const nickname = message.nickname?.trim() || "익명";
  const isQuestion = !!message.classification?.is_question;
  const hasAnswer = !!message.answer;

  return (
    <li className="ax-fade-in flex flex-col gap-2.5">
      <div className="flex items-end gap-2">
        <div className="w-9 shrink-0">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: colorFromKey(nickname) }}
          >
            {nickname.slice(0, 1)}
          </div>
        </div>
        <div className="flex max-w-[92%] flex-col items-start">
          <div className="mb-0.5 flex items-baseline gap-2 text-[13px]">
            <span className="font-semibold">{nickname}</span>
            {isQuestion ? (
              <span className="rounded-full bg-accent-dim px-2 py-px text-[11px] font-bold text-accent">
                질문
              </span>
            ) : null}
          </div>
          <p
            className={
              "whitespace-pre-wrap break-words rounded-2xl rounded-tl-md border px-4 py-2.5 text-[18px] leading-snug " +
              (isQuestion
                ? "border-accent/40 bg-accent-dim/60 ring-2 ring-accent/40 shadow-[0_0_20px_rgba(0,212,255,0.3)]"
                : "border-white/10 bg-white/[0.05]")
            }
          >
            {message.content}
          </p>
        </div>
      </div>

      {hasAnswer ? (
        <div className="flex flex-row-reverse items-end gap-2">
          <div className="w-9 shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-purple-500 text-[11px] font-bold text-white">
              AX
            </div>
          </div>
          <div className="flex max-w-[92%] flex-col items-end">
            <div className="mb-0.5 flex flex-row-reverse items-baseline gap-2 text-[13px]">
              <span className="font-semibold text-accent">HR-AX</span>
            </div>
            <div className="rounded-2xl rounded-tr-md border border-cyan-400/20 bg-cyan-400/5 px-4 py-3">
              <p className="mb-2 border-r-2 border-accent/40 pr-2 text-right text-[14px] leading-snug text-muted">
                Q. {message.content}
              </p>
              <p className="whitespace-pre-wrap break-words text-[20px] leading-snug">
                <Typewriter
                  text={message.answer ?? ""}
                  instant={alreadyTyped}
                  onDone={onTyped}
                />
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function Typewriter({
  text,
  instant,
  onDone,
}: {
  text: string;
  instant: boolean;
  onDone: () => void;
}) {
  const [shown, setShown] = useState(instant ? text : "");
  const doneRef = useRef(false);

  useEffect(() => {
    if (instant) {
      setShown(text);
      if (!doneRef.current) {
        doneRef.current = true;
        onDone();
      }
      return;
    }
    setShown("");
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        window.clearInterval(id);
        if (!doneRef.current) {
          doneRef.current = true;
          onDone();
        }
      }
    }, 24);
    return () => window.clearInterval(id);
  }, [text, instant, onDone]);

  return (
    <>
      {shown}
      {!instant && shown.length < text.length ? (
        <span className="ax-caret" aria-hidden />
      ) : null}
    </>
  );
}
