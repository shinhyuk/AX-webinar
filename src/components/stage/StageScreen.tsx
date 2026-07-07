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
  | { kind: "transform" };

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
  { kind: "transform" }, // 변신 완료 = 시나리오 끝 (QR은 채팅창 상단에 상시 표시)
];

type TheaterState = {
  introLines: Array<{ who: "host" | "shin"; text: string }>;
  loading: boolean;
  transformed: boolean;
};

function deriveTheater(count: number): TheaterState {
  const s: TheaterState = {
    introLines: [],
    loading: false,
    transformed: false,
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
        break;
    }
  }
  return s;
}

/* ── 효과음 (Web Audio 합성, 음원 파일 불필요) ─────────── */

let typingAudioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!typingAudioCtx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;
    typingAudioCtx = new Ctor();
  }
  if (typingAudioCtx.state === "suspended") void typingAudioCtx.resume();
  return typingAudioCtx;
}

function makeNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(
    1,
    Math.max(1, Math.floor(ctx.sampleRate * seconds)),
    ctx.sampleRate,
  );
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function playKeySound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

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

/** 글리치 라이저 (변신 도입부 1초, 이후는 영상 자체 사운드 사용) */
function playGlitchSound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t = ctx.currentTime;

    const riser = ctx.createOscillator();
    riser.type = "sawtooth";
    riser.frequency.setValueAtTime(65, t);
    riser.frequency.exponentialRampToValueAtTime(700, t + 0.95);
    const riserFilter = ctx.createBiquadFilter();
    riserFilter.type = "lowpass";
    riserFilter.frequency.setValueAtTime(300, t);
    riserFilter.frequency.exponentialRampToValueAtTime(6000, t + 0.95);
    const riserGain = ctx.createGain();
    riserGain.gain.setValueAtTime(0.001, t);
    riserGain.gain.exponentialRampToValueAtTime(0.13, t + 0.85);
    riserGain.gain.exponentialRampToValueAtTime(0.001, t + 1.05);
    riser.connect(riserFilter);
    riserFilter.connect(riserGain);
    riserGain.connect(ctx.destination);
    riser.start(t);
    riser.stop(t + 1.1);

    const sweep = ctx.createBufferSource();
    sweep.buffer = makeNoiseBuffer(ctx, 1.05);
    const sweepBand = ctx.createBiquadFilter();
    sweepBand.type = "bandpass";
    sweepBand.Q.value = 1.4;
    sweepBand.frequency.setValueAtTime(250, t);
    sweepBand.frequency.exponentialRampToValueAtTime(7000, t + 0.95);
    const sweepGain = ctx.createGain();
    sweepGain.gain.setValueAtTime(0.001, t);
    sweepGain.gain.exponentialRampToValueAtTime(0.09, t + 0.85);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 1.05);
    sweep.connect(sweepBand);
    sweepBand.connect(sweepGain);
    sweepGain.connect(ctx.destination);
    sweep.start(t);
    sweep.stop(t + 1.1);
  } catch {
    // 오디오 미지원/차단 환경에서는 조용히 무시
  }
}

/** 패널 조립 사운드: 금속 클랭크 3연타 + 베이스 드롭 */
function playAssembleSound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(ctx.destination);

    [
      [0.05, 720],
      [0.25, 540],
      [0.45, 880],
    ].forEach(([d, freq]) => {
      const at = t + d;
      const hit = ctx.createOscillator();
      hit.type = "square";
      hit.frequency.setValueAtTime(freq, at);
      hit.frequency.exponentialRampToValueAtTime(freq * 0.55, at + 0.09);
      const hitGain = ctx.createGain();
      hitGain.gain.setValueAtTime(0.16, at);
      hitGain.gain.exponentialRampToValueAtTime(0.001, at + 0.13);
      const hitBand = ctx.createBiquadFilter();
      hitBand.type = "bandpass";
      hitBand.frequency.value = freq * 2.4;
      hitBand.Q.value = 6;
      hit.connect(hitBand);
      hitBand.connect(hitGain);
      hitGain.connect(out);
      hit.start(at);
      hit.stop(at + 0.15);

      const click = ctx.createBufferSource();
      click.buffer = makeNoiseBuffer(ctx, 0.05);
      const clickHp = ctx.createBiquadFilter();
      clickHp.type = "highpass";
      clickHp.frequency.value = 3000;
      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.13, at);
      clickGain.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
      click.connect(clickHp);
      clickHp.connect(clickGain);
      clickGain.connect(out);
      click.start(at);
      click.stop(at + 0.06);
    });

    const drop = ctx.createOscillator();
    drop.type = "sine";
    drop.frequency.setValueAtTime(95, t + 0.6);
    drop.frequency.exponentialRampToValueAtTime(42, t + 1.2);
    const dropGain = ctx.createGain();
    dropGain.gain.setValueAtTime(0.001, t + 0.58);
    dropGain.gain.exponentialRampToValueAtTime(0.32, t + 0.65);
    dropGain.gain.exponentialRampToValueAtTime(0.001, t + 1.35);
    drop.connect(dropGain);
    dropGain.connect(out);
    drop.start(t + 0.58);
    drop.stop(t + 1.4);
  } catch {
    // 오디오 미지원/차단 환경에서는 조용히 무시
  }
}

/** 변신 영상 (AI 생성, /public/transform.mp4 — 자체 사운드 포함) */
const TRANSFORM_VIDEO_SRC = "/transform.mp4";

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

  // 채팅 패널 표시 여부 (우측으로 접기/펼치기)
  const [chatHidden, setChatHidden] = useState(false);

  // 시나리오 상태
  const [stepIndex, setStepIndex] = useState(0);
  // 변신 시퀀스: glitch(붕괴 1초) → video(AI 영상 ~9초) → assemble(패널 조립) → none
  const [transformPhase, setTransformPhase] = useState<
    "none" | "glitch" | "video" | "assemble"
  >("none");
  const [exited, setExited] = useState(!demo);
  const transformTimersRef = useRef<number[]>([]);
  const transformPhaseRef = useRef(transformPhase);
  transformPhaseRef.current = transformPhase;
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const clearTransformTimers = useCallback(() => {
    for (const id of transformTimersRef.current) window.clearTimeout(id);
    transformTimersRef.current = [];
  }, []);

  const t = deriveTheater(exited ? THEATER_SCRIPT.length : stepIndex);
  const transformed = exited || t.transformed;

  const advance = useCallback(() => {
    setStepIndex((i) => {
      if (i >= THEATER_SCRIPT.length) return i;
      const step = THEATER_SCRIPT[i];
      if (step.kind === "transform") {
        clearTransformTimers();
        playGlitchSound();
        setTransformPhase("glitch");
        transformTimersRef.current = [
          window.setTimeout(() => setTransformPhase("video"), 1000),
        ];
      }
      return i + 1;
    });
  }, [clearTransformTimers]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
    clearTransformTimers();
    videoRef.current?.pause();
    setTransformPhase("none");
  }, [clearTransformTimers]);

  useEffect(() => clearTransformTimers, [clearTransformTimers]);

  // 영상 종료(또는 실패) → 패널 조립으로 전환
  const goAssemble = useCallback(() => {
    if (transformPhaseRef.current !== "video") return;
    playAssembleSound();
    setTransformPhase("assemble");
    transformTimersRef.current.push(
      window.setTimeout(() => setTransformPhase("none"), 1150),
    );
  }, []);

  // video 단계 진입 시 재생 시작 (직전 키 입력이 사용자 제스처라 소리 재생 가능)
  useEffect(() => {
    if (transformPhase !== "video") return;
    const v = videoRef.current;
    if (!v) {
      goAssemble();
      return;
    }
    v.currentTime = 0;
    v.muted = false;
    v.play().catch(() => {
      // 소리 자동재생이 막히면 음소거로라도 재생
      v.muted = true;
      v.play().catch(() => goAssemble());
    });
    // onEnded 미발화 대비 안전 타이머
    const ms =
      Number.isFinite(v.duration) && v.duration > 0
        ? v.duration * 1000 + 1500
        : 12000;
    const id = window.setTimeout(goAssemble, ms);
    return () => window.clearTimeout(id);
  }, [transformPhase, goAssemble]);

  // 연출이 끝나면 포커스를 창으로 회수해 다음 키 입력이 바로 먹히게 한다
  useEffect(() => {
    if (transformPhase !== "none") return;
    const el = document.activeElement;
    if (el instanceof HTMLElement && el !== document.body) el.blur();
    window.focus();
  }, [transformPhase]);

  // 인트로 동안 영상 미리 버퍼링
  useEffect(() => {
    if (!demo) return;
    const v = document.createElement("video");
    v.preload = "auto";
    v.src = TRANSFORM_VIDEO_SRC;
    v.load();
  }, [demo]);

  // 시나리오 종료 여부 (마지막 스텝 = QR 구석 이동까지 완료)
  const scriptDone = exited || stepIndex >= THEATER_SCRIPT.length;
  const scriptDoneRef = useRef(scriptDone);
  scriptDoneRef.current = scriptDone;
  const pptFrameRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (!demo) return;
    const onKey = (e: KeyboardEvent) => {
      // 시나리오가 끝나면 키를 가로채지 않음 (리모컨 → PPT)
      if (scriptDoneRef.current) return;
      // 수정키 단독 입력은 무시
      if (["Shift", "Control", "Alt", "Meta", "CapsLock"].includes(e.key))
        return;
      if (e.key === "0") {
        setExited(true);
        clearTransformTimers();
        videoRef.current?.pause();
        setTransformPhase("none");
        return;
      }
      // 변신 연출(글리치/영상/조립) 중에는 키 입력이 단계를 건너뛰지 않도록 무시
      if (transformPhaseRef.current !== "none") {
        e.preventDefault();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      } else {
        // 아무 키나 누르면 다음 장면으로
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [demo, advance, back, clearTransformTimers]);

  // 시나리오가 끝나면 (또는 일반 모드에서 로드되면) PPT iframe에 포커스를 넘겨
  // 프레젠터 리모컨의 방향키가 슬라이드 넘김으로 전달되게 한다
  const pptUrl = cfg?.ppt_embed_url ?? null;
  useEffect(() => {
    if (!scriptDone || !pptUrl) return;
    const id = window.setTimeout(() => pptFrameRef.current?.focus(), 400);
    return () => window.clearTimeout(id);
  }, [scriptDone, pptUrl]);

  useEffect(() => {
    if (initialIdsRef.current !== null) return;
    if (loading) return;
    initialIdsRef.current = new Set(
      messages.filter((m) => m.answer).map((m) => m.id),
    );
    setTypedIds(new Set(initialIdsRef.current));
  }, [loading, messages]);

  // 채팅은 항상 최신(하단)이 보이도록 — 새 메시지·타이핑 애니메이션으로
  // 내용 높이가 변할 때마다 스크롤을 바닥에 고정
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatContentRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const box = chatScrollRef.current;
    const content = chatContentRef.current;
    if (!box || !content) return;
    const stick = () => {
      box.scrollTop = box.scrollHeight;
    };
    stick();
    const ro = new ResizeObserver(stick);
    ro.observe(content);
    ro.observe(box);
    return () => ro.disconnect();
  }, [loading]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const showIntro =
    demo && !exited && (!transformed || transformPhase === "glitch");
  const assembling = demo && !exited && transformPhase === "assemble";

  if (showIntro) {
    return (
      <IntroChat
        lines={t.introLines}
        loading={t.loading}
        glitching={transformPhase === "glitch"}
        onAdvance={advance}
      />
    );
  }

  return (
    <div
      className={
        "relative h-[100dvh] overflow-hidden bg-background p-3" +
        (assembling ? " ax-settle-shake" : "")
      }
    >
      {/* AI 생성 변신 영상 (미리 마운트해 버퍼링, video 단계에서만 표시) */}
      {demo && !exited ? (
        <video
          ref={videoRef}
          src={TRANSFORM_VIDEO_SRC}
          preload="auto"
          playsInline
          onEnded={goAssemble}
          onError={goAssemble}
          className={
            "absolute inset-0 z-[60] h-full w-full bg-black object-cover" +
            (transformPhase === "video" ? "" : " hidden")
          }
        />
      ) : null}
      {assembling ? (
        <div className="ax-flash pointer-events-none absolute inset-0 z-50 bg-white" />
      ) : null}

      <div
        className="grid h-full transition-all duration-500 ease-in-out"
        style={{
          gridTemplateColumns: chatHidden ? "1fr 0fr" : "31fr 9fr",
          columnGap: chatHidden ? "0px" : "12px",
        }}
      >
        <div
          className={
            assembling ? "ax-assemble-left min-h-0" : "min-h-0"
          }
        >
          <PptPanel
            url={pptUrl}
            frameRef={pptFrameRef}
            keysEnabled={scriptDone}
          />
        </div>

        <section
          className={
            "ax-card flex min-h-0 min-w-0 flex-col overflow-hidden transition-opacity duration-500 " +
            (chatHidden ? "opacity-0 " : "") +
            (assembling ? "ax-assemble-right" : "")
          }
        >
            {/* 참여 QR — 채팅창 상단 상시 표시 */}
            <div className="flex items-center gap-4 border-b border-line bg-white/[0.03] px-5 py-3">
              <div className="shrink-0 rounded-xl bg-white p-2">
                <QRCodeSVG value={QR_URL} size={84} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.22em] text-accent">
                  JOIN NOW
                </p>
                <p className="mt-0.5 truncate text-2xl font-bold tracking-tight">
                  hrax.app
                </p>
                <p className="mt-0.5 text-[12px] text-muted">
                  질문과 반응을 실시간으로
                </p>
              </div>
            </div>
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
            <div
              ref={chatScrollRef}
              className="ax-scroll flex-1 min-h-0 overflow-y-auto px-4 py-4"
            >
              <div ref={chatContentRef} className="flex min-h-full flex-col">
                {loading ? (
                  <p className="text-base text-muted">불러오는 중...</p>
                ) : messages.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center">
                    <p className="text-center text-base text-muted">
                      청중 메시지가 여기 표시됩니다
                    </p>
                  </div>
                ) : (
                  <ul className="mt-auto flex flex-col gap-4">
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
            </div>
          </section>
      </div>

      {/* 채팅 패널 접기/펼치기 핸들 (우측 가장자리) */}
      <button
        type="button"
        onClick={() => setChatHidden((v) => !v)}
        aria-label={chatHidden ? "채팅창 열기" : "채팅창 숨기기"}
        title={chatHidden ? "채팅창 열기" : "채팅창 숨기기"}
        className="ax-btn-ghost absolute right-1.5 top-1/2 z-40 flex h-16 w-7 -translate-y-1/2 items-center justify-center rounded-xl text-lg"
      >
        {chatHidden ? "‹" : "›"}
      </button>

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

function isPdfUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return /\.pdf(\?|#|$)/i.test(url);
  }
}

function PptPanel({
  url,
  frameRef,
  keysEnabled,
}: {
  url: string | null;
  frameRef?: React.Ref<HTMLIFrameElement>;
  keysEnabled: boolean;
}) {
  if (!url) {
    return (
      <section className="ax-card flex h-full min-h-0 items-center justify-center overflow-hidden">
        <div className="px-8 text-center text-muted">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-accent">
            PPT EMBED
          </p>
          <p className="mt-2 text-base">
            /control에서 발표자료를 업로드하면 여기에 표시됩니다.
          </p>
        </div>
      </section>
    );
  }
  if (isPdfUrl(url)) {
    return <PdfSlides url={url} keysEnabled={keysEnabled} />;
  }
  return (
    <section className="ax-card h-full overflow-hidden">
      <iframe
        ref={frameRef}
        src={url}
        className="h-full w-full"
        frameBorder={0}
        allow="fullscreen"
        title="presentation"
      />
    </section>
  );
}

/* ── PDF 자체 뷰어 — 페이지 넘김을 부모 창에서 직접 제어
      (iframe 포커스 문제 없이 리모컨 방향키가 항상 동작) ── */

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<{
    getViewport: (opts: { scale: number }) => {
      width: number;
      height: number;
    };
    render: (opts: {
      canvasContext: CanvasRenderingContext2D;
      viewport: { width: number; height: number };
    }) => { promise: Promise<void>; cancel: () => void };
  }>;
  destroy: () => void;
};

function PdfSlides({
  url,
  keysEnabled,
}: {
  url: string;
  keysEnabled: boolean;
}) {
  const boxRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docRef = useRef<PdfDoc | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void } | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url,
        ).toString();
        const doc = (await pdfjs.getDocument({ url })
          .promise) as unknown as PdfDoc;
        if (cancelled) {
          doc.destroy();
          return;
        }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setPage(1);
      } catch {
        if (!cancelled) setError("PDF를 불러오지 못했습니다.");
      }
    })();
    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
      docRef.current?.destroy();
      docRef.current = null;
    };
  }, [url]);

  const renderPage = useCallback(async () => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!doc || !canvas || !box) return;
    try {
      const p = await doc.getPage(page);
      const base = p.getViewport({ scale: 1 });
      const fit = Math.min(
        box.clientWidth / base.width,
        box.clientHeight / base.height,
      );
      const dpr = window.devicePixelRatio || 1;
      const viewport = p.getViewport({ scale: fit * dpr });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      renderTaskRef.current?.cancel();
      const task = p.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = task;
      await task.promise.catch(() => {});
    } catch {
      // 페이지 전환 중 취소 등은 무시
    }
  }, [page]);

  useEffect(() => {
    if (numPages > 0) void renderPage();
  }, [numPages, renderPage]);

  // 패널 크기가 바뀌면 다시 맞춰 렌더
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const ro = new ResizeObserver(() => void renderPage());
    ro.observe(box);
    return () => ro.disconnect();
  }, [renderPage]);

  const numPagesRef = useRef(numPages);
  numPagesRef.current = numPages;
  const go = useCallback((delta: number) => {
    setPage((p) => Math.min(Math.max(1, p + delta), numPagesRef.current || 1));
  }, []);

  // 리모컨/키보드 페이지 넘김 — 부모 창에서 직접 처리
  useEffect(() => {
    if (!keysEnabled) return;
    const NEXT = ["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"];
    const PREV = ["ArrowLeft", "ArrowUp", "PageUp"];
    const onKey = (e: KeyboardEvent) => {
      if (NEXT.includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (PREV.includes(e.key)) {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keysEnabled, go]);

  return (
    <section className="ax-card relative h-full min-h-0 overflow-hidden">
      <div
        ref={boxRef}
        className="flex h-full w-full cursor-pointer items-center justify-center bg-black/30"
        onClick={() => go(1)}
      >
        {error ? (
          <p className="text-base text-muted">{error}</p>
        ) : numPages === 0 ? (
          <p className="text-base text-muted">발표자료 불러오는 중...</p>
        ) : (
          <canvas ref={canvasRef} />
        )}
      </div>
      {numPages > 0 ? (
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-1.5 backdrop-blur">
          <button
            type="button"
            aria-label="이전 슬라이드"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            className="ax-btn-ghost flex h-8 w-8 items-center justify-center rounded-full text-base"
          >
            ‹
          </button>
          <span className="min-w-[52px] text-center text-[12px] font-semibold tabular-nums text-foreground/80">
            {page} / {numPages}
          </span>
          <button
            type="button"
            aria-label="다음 슬라이드"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            className="ax-btn-ghost flex h-8 w-8 items-center justify-center rounded-full text-base"
          >
            ›
          </button>
        </div>
      ) : null}
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
