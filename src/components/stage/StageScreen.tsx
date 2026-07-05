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

/** 변신 시퀀스 사운드트랙 (~10초):
 *  글리치 라이저 → 하이퍼스페이스 드론+스파클 → 로봇 서보/클랭크
 *  → 파워업 코드 → 차지 라이저 → 대폭발 → 패널 클랭크 → 베이스 드롭 */
function playTransformSound() {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 1;
    out.connect(ctx.destination);

    const clank = (at: number, freq: number, vol = 0.16) => {
      const hit = ctx.createOscillator();
      hit.type = "square";
      hit.frequency.setValueAtTime(freq, at);
      hit.frequency.exponentialRampToValueAtTime(freq * 0.55, at + 0.09);
      const hitGain = ctx.createGain();
      hitGain.gain.setValueAtTime(vol, at);
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
      clickGain.gain.setValueAtTime(vol * 0.8, at);
      clickGain.gain.exponentialRampToValueAtTime(0.001, at + 0.05);
      click.connect(clickHp);
      clickHp.connect(clickGain);
      clickGain.connect(out);
      click.start(at);
      click.stop(at + 0.06);
    };

    // ── 0~1.0s: 글리치 라이저
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
    riserGain.connect(out);
    riser.start(t);
    riser.stop(t + 1.1);

    // ── 1.0~4.0s: 하이퍼스페이스 — 우주 드론 + 워프 노이즈 + 스파클
    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.setValueAtTime(48, t + 1.0);
    drone.frequency.linearRampToValueAtTime(60, t + 4.0);
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.001, t + 1.0);
    droneGain.gain.exponentialRampToValueAtTime(0.16, t + 1.4);
    droneGain.gain.exponentialRampToValueAtTime(0.001, t + 4.1);
    drone.connect(droneGain);
    droneGain.connect(out);
    drone.start(t + 1.0);
    drone.stop(t + 4.15);

    const warpNoise = ctx.createBufferSource();
    warpNoise.buffer = makeNoiseBuffer(ctx, 3.2);
    const warpLp = ctx.createBiquadFilter();
    warpLp.type = "lowpass";
    warpLp.frequency.setValueAtTime(900, t + 1.0);
    warpLp.frequency.exponentialRampToValueAtTime(5200, t + 3.9);
    const warpGain = ctx.createGain();
    warpGain.gain.setValueAtTime(0.001, t + 1.0);
    warpGain.gain.exponentialRampToValueAtTime(0.09, t + 1.5);
    warpGain.gain.exponentialRampToValueAtTime(0.13, t + 3.8);
    warpGain.gain.exponentialRampToValueAtTime(0.001, t + 4.1);
    warpNoise.connect(warpLp);
    warpLp.connect(warpGain);
    warpGain.connect(out);
    warpNoise.start(t + 1.0);
    warpNoise.stop(t + 4.2);

    // 별 스파클 핑
    [1.6, 2.1, 2.5, 3.0, 3.4].forEach((d, i) => {
      const ping = ctx.createOscillator();
      ping.type = "sine";
      const f = 1200 + i * 260;
      ping.frequency.setValueAtTime(f, t + d);
      ping.frequency.exponentialRampToValueAtTime(f * 1.6, t + d + 0.12);
      const pingGain = ctx.createGain();
      pingGain.gain.setValueAtTime(0.05, t + d);
      pingGain.gain.exponentialRampToValueAtTime(0.001, t + d + 0.25);
      ping.connect(pingGain);
      pingGain.connect(out);
      ping.start(t + d);
      ping.stop(t + d + 0.3);
    });

    // ── 4.0~6.0s: 로봇 부품 서보 + 결합 클랭크
    [4.15, 4.5, 4.8, 5.0, 5.2, 5.4].forEach((d, i) => {
      const servo = ctx.createOscillator();
      servo.type = "square";
      const f0 = 340 - i * 18;
      servo.frequency.setValueAtTime(f0, t + d);
      servo.frequency.exponentialRampToValueAtTime(f0 * 0.4, t + d + 0.2);
      const servoGain = ctx.createGain();
      servoGain.gain.setValueAtTime(0.06, t + d);
      servoGain.gain.exponentialRampToValueAtTime(0.001, t + d + 0.22);
      const servoLp = ctx.createBiquadFilter();
      servoLp.type = "lowpass";
      servoLp.frequency.value = 1500;
      servo.connect(servoLp);
      servoLp.connect(servoGain);
      servoGain.connect(out);
      servo.start(t + d);
      servo.stop(t + d + 0.25);
      clank(t + d + 0.2, 600 + (i % 3) * 140, 0.13);
    });

    // ── 5.9s: 눈 점등 핑 + 파워업 코드
    const eye = ctx.createOscillator();
    eye.type = "sine";
    eye.frequency.setValueAtTime(1500, t + 5.9);
    eye.frequency.exponentialRampToValueAtTime(2400, t + 6.05);
    const eyeGain = ctx.createGain();
    eyeGain.gain.setValueAtTime(0.09, t + 5.9);
    eyeGain.gain.exponentialRampToValueAtTime(0.001, t + 6.2);
    eye.connect(eyeGain);
    eyeGain.connect(out);
    eye.start(t + 5.9);
    eye.stop(t + 6.25);

    [220, 277.18, 329.63].forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(f, t + 6.0);
      osc.frequency.exponentialRampToValueAtTime(f * 2, t + 7.3);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.001, t + 6.0);
      g.gain.exponentialRampToValueAtTime(0.055, t + 6.3);
      g.gain.exponentialRampToValueAtTime(0.001, t + 7.45);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(800, t + 6.0);
      lp.frequency.exponentialRampToValueAtTime(5000, t + 7.3);
      osc.connect(lp);
      lp.connect(g);
      g.connect(out);
      osc.start(t + 6.0);
      osc.stop(t + 7.5);
    });

    // ── 6.6~7.4s: 차지 라이저
    const charge = ctx.createOscillator();
    charge.type = "sawtooth";
    charge.frequency.setValueAtTime(120, t + 6.6);
    charge.frequency.exponentialRampToValueAtTime(1100, t + 7.4);
    const chargeGain = ctx.createGain();
    chargeGain.gain.setValueAtTime(0.001, t + 6.6);
    chargeGain.gain.exponentialRampToValueAtTime(0.14, t + 7.35);
    chargeGain.gain.exponentialRampToValueAtTime(0.001, t + 7.5);
    charge.connect(chargeGain);
    chargeGain.connect(out);
    charge.start(t + 6.6);
    charge.stop(t + 7.55);

    // ── 7.45s: 대폭발
    const boom = ctx.createOscillator();
    boom.type = "sine";
    boom.frequency.setValueAtTime(170, t + 7.45);
    boom.frequency.exponentialRampToValueAtTime(30, t + 8.3);
    const boomGain = ctx.createGain();
    boomGain.gain.setValueAtTime(0.001, t + 7.43);
    boomGain.gain.exponentialRampToValueAtTime(0.45, t + 7.5);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 8.5);
    boom.connect(boomGain);
    boomGain.connect(out);
    boom.start(t + 7.43);
    boom.stop(t + 8.55);

    const crash = ctx.createBufferSource();
    crash.buffer = makeNoiseBuffer(ctx, 0.9);
    const crashLp = ctx.createBiquadFilter();
    crashLp.type = "lowpass";
    crashLp.frequency.setValueAtTime(6500, t + 7.45);
    crashLp.frequency.exponentialRampToValueAtTime(250, t + 8.3);
    const crashGain = ctx.createGain();
    crashGain.gain.setValueAtTime(0.3, t + 7.45);
    crashGain.gain.exponentialRampToValueAtTime(0.001, t + 8.35);
    crash.connect(crashLp);
    crashLp.connect(crashGain);
    crashGain.connect(out);
    crash.start(t + 7.45);
    crash.stop(t + 8.4);

    // ── 8.55~9.0s: 패널 결합 클랭크 3연타
    clank(t + 8.55, 720);
    clank(t + 8.75, 540);
    clank(t + 8.95, 880);

    // ── 9.1s: 마무리 베이스 드롭
    const drop = ctx.createOscillator();
    drop.type = "sine";
    drop.frequency.setValueAtTime(95, t + 9.1);
    drop.frequency.exponentialRampToValueAtTime(42, t + 9.7);
    const dropGain = ctx.createGain();
    dropGain.gain.setValueAtTime(0.001, t + 9.08);
    dropGain.gain.exponentialRampToValueAtTime(0.32, t + 9.15);
    dropGain.gain.exponentialRampToValueAtTime(0.001, t + 9.85);
    drop.connect(dropGain);
    dropGain.connect(out);
    drop.start(t + 9.08);
    drop.stop(t + 9.9);
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
  // 변신 시퀀스(~10초): glitch(붕괴) → space(하이퍼스페이스) → robot(메카 조립)
  // → burst(대폭발) → assemble(패널 조립) → none
  const [transformPhase, setTransformPhase] = useState<
    "none" | "glitch" | "space" | "robot" | "burst" | "assemble"
  >("none");
  const [exited, setExited] = useState(!demo);
  const transformTimersRef = useRef<number[]>([]);

  const clearTransformTimers = useCallback(() => {
    for (const id of transformTimersRef.current) window.clearTimeout(id);
    transformTimersRef.current = [];
  }, []);

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
        clearTransformTimers();
        playTransformSound();
        setTransformPhase("glitch");
        transformTimersRef.current = [
          window.setTimeout(() => setTransformPhase("space"), 1000),
          window.setTimeout(() => setTransformPhase("robot"), 4000),
          window.setTimeout(() => setTransformPhase("burst"), 7400),
          window.setTimeout(() => setTransformPhase("assemble"), 8450),
          window.setTimeout(() => setTransformPhase("none"), 9600),
        ];
      }
      return i + 1;
    });
  }, [clearTransformTimers]);

  const back = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
    clearTransformTimers();
    setTransformPhase("none");
  }, [clearTransformTimers]);

  useEffect(() => clearTransformTimers, [clearTransformTimers]);

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
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        back();
      } else if (e.key === "0") {
        setExited(true);
        clearTransformTimers();
        setTransformPhase("none");
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
      {transformPhase === "space" ? <SpaceScene /> : null}
      {transformPhase === "robot" ? <RobotScene /> : null}
      {transformPhase === "burst" ? <WarpOverlay /> : null}
      {assembling ? (
        <div className="ax-flash pointer-events-none absolute inset-0 z-50 bg-white" />
      ) : null}

      <div className="grid h-full grid-cols-[7fr_3fr] gap-3">
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
            "ax-card flex min-h-0 flex-col overflow-hidden " +
            (assembling ? "ax-assemble-right" : "")
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

/* ── Act 1: 우주 하이퍼스페이스 (캔버스 별 워프 + 성운 + 행성) ── */

function StarfieldCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 460 }, () => ({
      x: Math.random() - 0.5,
      y: Math.random() - 0.5,
      z: 0.05 + Math.random() * 0.95,
      hue: Math.random(),
    }));
    const start = performance.now();
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000;
      // 시간이 갈수록 가속 — 하이퍼스페이스 진입
      const speed = 0.2 + elapsed * elapsed * 0.4;
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const focal = Math.min(w, h);
      ctx.fillStyle = "rgba(2, 4, 14, 0.32)";
      ctx.fillRect(0, 0, w, h);
      for (const s of stars) {
        const prevZ = s.z;
        s.z -= speed * 0.016;
        if (s.z <= 0.02) {
          s.x = Math.random() - 0.5;
          s.y = Math.random() - 0.5;
          s.z = 1;
          continue;
        }
        const px = cx + (s.x / prevZ) * focal;
        const py = cy + (s.y / prevZ) * focal;
        const nx = cx + (s.x / s.z) * focal;
        const ny = cy + (s.y / s.z) * focal;
        if (nx < 0 || nx > w || ny < 0 || ny > h) {
          s.x = Math.random() - 0.5;
          s.y = Math.random() - 0.5;
          s.z = 1;
          continue;
        }
        const alpha = Math.min(1, (1 - s.z) * 1.5);
        ctx.strokeStyle =
          s.hue > 0.86
            ? `rgba(196, 181, 253, ${alpha})`
            : s.hue > 0.72
              ? `rgba(103, 232, 249, ${alpha})`
              : `rgba(226, 240, 255, ${alpha})`;
        ctx.lineWidth = Math.max(1, (1 - s.z) * 3.2 * dpr);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.stroke();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={canvasRef} className="h-full w-full" />;
}

function SpaceScene() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden bg-[#02040e]">
      <StarfieldCanvas />
      {/* 성운 */}
      <div className="ax-nebula absolute -left-[20%] top-[10%] h-[60vmax] w-[60vmax] rounded-full" />
      <div
        className="ax-nebula absolute -right-[25%] bottom-[5%] h-[55vmax] w-[55vmax] rounded-full"
        style={{
          animationDelay: "0.6s",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.28) 0%, rgba(124,58,237,0.08) 45%, transparent 70%)",
        }}
      />
      {/* 스쳐 지나가는 행성 */}
      <div className="ax-planet absolute left-1/2 top-1/2 h-[46vmax] w-[46vmax] rounded-full" />
      {/* 타이틀 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="ax-space-title text-[clamp(28px,5vw,64px)] font-bold tracking-[0.35em] text-white">
            AX PROTOCOL
          </p>
          <p className="ax-space-sub mt-3 text-[clamp(13px,1.6vw,20px)] font-semibold tracking-[0.5em] text-accent">
            INITIATING TRANSFORMATION
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Act 2: 메카 조립 (부품 비행 결합 + 눈 점등 + 차지업) ── */

function RobotScene() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[60] overflow-hidden bg-[#02040e]">
      {/* 퍼스펙티브 그리드 바닥 */}
      <div className="ax-grid-floor absolute inset-x-[-50%] bottom-[-12%] h-[55%]" />
      {/* 후광 */}
      <div className="ax-bot-halo absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      {/* 로봇 */}
      <div className="ax-bot-charge absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 240 300"
          className="h-[72vmin] w-auto drop-shadow-[0_0_24px_rgba(0,212,255,0.55)]"
          aria-hidden
        >
          <g
            fill="rgba(10, 22, 44, 0.94)"
            stroke="#00d4ff"
            strokeWidth="2.5"
            strokeLinejoin="round"
          >
            {/* 몸통 */}
            <g className="ax-bot-torso">
              <polygon points="78,78 162,78 152,152 120,168 88,152" />
              <polygon
                points="100,86 140,86 134,116 106,116"
                fill="rgba(124,58,237,0.25)"
                stroke="#a78bfa"
                strokeWidth="1.5"
              />
              <circle
                className="ax-bot-core"
                cx="120"
                cy="132"
                r="13"
                fill="#00d4ff"
                stroke="#e0faff"
              />
            </g>
            {/* 머리 */}
            <g className="ax-bot-head">
              <polygon points="94,28 146,28 156,54 120,70 84,54" />
              <line x1="120" y1="28" x2="120" y2="12" stroke="#a78bfa" />
              <circle cx="120" cy="10" r="3" fill="#a78bfa" stroke="none" />
              <rect
                className="ax-bot-eye"
                x="96"
                y="42"
                width="16"
                height="7"
                rx="2"
                fill="#00d4ff"
                stroke="none"
              />
              <rect
                className="ax-bot-eye"
                x="128"
                y="42"
                width="16"
                height="7"
                rx="2"
                fill="#00d4ff"
                stroke="none"
              />
            </g>
            {/* 왼팔 */}
            <g className="ax-bot-arm-l">
              <polygon points="42,74 78,74 76,104 44,104" />
              <polygon points="46,104 72,104 66,178 44,172" />
              <circle cx="56" cy="188" r="13" />
            </g>
            {/* 오른팔 */}
            <g className="ax-bot-arm-r">
              <polygon points="162,74 198,74 196,104 164,104" />
              <polygon points="168,104 194,104 196,172 174,178" />
              <circle cx="184" cy="188" r="13" />
            </g>
            {/* 왼다리 */}
            <g className="ax-bot-leg-l">
              <polygon points="92,168 116,172 112,252 90,248" />
              <polygon points="82,248 114,252 112,272 80,268" />
            </g>
            {/* 오른다리 */}
            <g className="ax-bot-leg-r">
              <polygon points="124,172 148,168 150,248 128,252" />
              <polygon points="126,252 158,248 160,268 128,272" />
            </g>
          </g>
        </svg>
      </div>
      {/* 상태 텍스트 */}
      <div className="absolute inset-x-0 bottom-[8%] flex justify-center">
        <p className="ax-bot-caption text-[clamp(16px,2.2vw,28px)] font-bold tracking-[0.4em] text-accent">
          HR-AX SYSTEM ONLINE
        </p>
      </div>
    </div>
  );
}

/* ── 워프 연출: 에너지 코어 + 파티클 버스트 + 충격파 링 ── */

function WarpOverlay() {
  // 파티클 방향/거리/타이밍은 마운트 시 1회 생성
  const particles = useRef(
    Array.from({ length: 56 }, (_, i) => ({
      angle: (i / 56) * 360 + Math.random() * 8,
      dist: 42 + Math.random() * 55, // vmax
      delay: Math.random() * 0.25,
      size: 2 + Math.random() * 3,
      hue: Math.random() > 0.5 ? "#00d4ff" : "#a78bfa",
    })),
  ).current;

  return (
    <div className="ax-warp-bg pointer-events-none absolute inset-0 z-[60] overflow-hidden bg-black">
      {/* 회전하는 스피드라인 */}
      <div className="ax-warp-spin absolute left-1/2 top-1/2 h-[220vmax] w-[220vmax] -translate-x-1/2 -translate-y-1/2" />
      {/* 중심 에너지 코어 */}
      <div className="ax-warp-core absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full" />
      {/* 충격파 링 */}
      {[0, 0.18, 0.36, 0.54].map((d) => (
        <div
          key={d}
          className="ax-warp-ring absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ animationDelay: `${d}s` }}
        />
      ))}
      {/* 파티클 버스트 */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="ax-warp-particle absolute left-1/2 top-1/2 rounded-full"
          style={
            {
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: p.hue,
              boxShadow: `0 0 ${p.size * 3}px ${p.hue}`,
              animationDelay: `${p.delay}s`,
              "--a": `${p.angle}deg`,
              "--d": `${p.dist}vmax`,
            } as React.CSSProperties
          }
        />
      ))}
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
