"use client";

import { useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** 카메라 영상을 매트릭스 '디지털 레인'으로 렌더링.
 *  - 셀 밝기 = 카메라 픽셀 밝기 → 초록 글자 모자이크로 실루엣이 보인다
 *  - 컬럼마다 떨어지는 밝은 헤드(rain drop)가 영화 느낌을 만든다 */
export function MatrixCam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const facingRef = useRef<"user" | "environment">("user");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(facing: "user" | "environment") {
    setError(null);
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      facingRef.current = facing;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setRunning(true);
    } catch {
      setError(
        "카메라를 열 수 없어요. 브라우저의 카메라 권한을 허용해 주세요.",
      );
    }
  }

  useEffect(() => {
    if (!running) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sample = document.createElement("canvas");
    const sctx = sample.getContext("2d", { willReadFrequently: true });
    if (!sctx) return;

    let raf = 0;
    let last = 0;
    let cols = 0;
    let rows = 0;
    let cell = 14;
    let drops: number[] = [];
    // 자동 명암 보정 범위 (프레임 간 부드럽게 따라감)
    let levelLo = 0.2;
    let levelHi = 0.8;

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // 컬럼 수를 ~110개로 제한해 모바일에서도 부드럽게
      cell = Math.max(12, Math.floor(w / 110));
      cols = Math.ceil(w / cell);
      rows = Math.ceil(h / cell);
      sample.width = cols;
      sample.height = rows;
      drops = Array.from({ length: cols }, () =>
        Math.floor(Math.random() * rows),
      );
      ctx!.fillStyle = "#000";
      ctx!.fillRect(0, 0, w, h);
    }
    resize();
    window.addEventListener("resize", resize);

    function frame(t: number) {
      raf = requestAnimationFrame(frame);
      if (t - last < 50) return; // ~20fps면 레인 효과로 충분
      last = t;
      if (!video || video.readyState < 2 || cols === 0) return;

      // 카메라 프레임을 cols×rows로 축소 샘플링 (cover + 좌우반전)
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return;
      const scale = Math.max(cols / vw, rows / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      sctx!.save();
      if (facingRef.current === "user") {
        sctx!.translate(cols, 0);
        sctx!.scale(-1, 1);
      }
      sctx!.drawImage(video, (cols - dw) / 2, (rows - dh) / 2, dw, dh);
      sctx!.restore();
      const px = sctx!.getImageData(0, 0, cols, rows).data;

      // 프레임 전체 밝기 분포(5%/95% 백분위)를 구해 자동 명암 보정.
      // 밝은 사무실처럼 대비가 약한 장면에서도 실루엣이 또렷하게 보인다.
      const total = cols * rows;
      const lums = new Float32Array(total);
      for (let i = 0; i < total; i++) {
        const p = i * 4;
        lums[i] =
          (px[p] * 0.2126 + px[p + 1] * 0.7152 + px[p + 2] * 0.0722) / 255;
      }
      const sorted = Float32Array.from(
        { length: Math.ceil(total / 4) },
        (_, i) => lums[i * 4],
      ).sort();
      const lo = sorted[Math.floor(sorted.length * 0.05)];
      const hi = sorted[Math.floor(sorted.length * 0.95)];
      levelLo += (lo - levelLo) * 0.2;
      levelHi += (hi - levelHi) * 0.2;
      const range = Math.max(0.08, levelHi - levelLo);

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx!.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx!.fillRect(0, 0, w, h);
      ctx!.font = `bold ${cell}px "Courier New", monospace`;
      ctx!.textBaseline = "top";

      for (let c = 0; c < cols; c++) {
        const head = drops[c];
        for (let r = 0; r < rows; r++) {
          const idx = r * cols + c;
          // 보정된 밝기 0~1 + 감마로 대비 강화 → 어두운 곳은 확실히 어둡게
          const norm = Math.min(
            1,
            Math.max(0, (lums[idx] - levelLo) / range),
          );
          const v = norm * norm * (3 - 2 * norm); // smoothstep
          const isHead = r === head;
          if (!isHead && v < 0.18) continue;
          const glyph =
            GLYPHS[(((c * 31 + r * 17 + t / 200) | 0) * 7) % GLYPHS.length];
          if (isHead) {
            // 떨어지는 헤드: 밝은 흰-초록
            ctx!.fillStyle = `rgba(210, 255, 220, ${0.35 + v * 0.65})`;
          } else {
            const a = 0.25 + v * 0.75;
            ctx!.fillStyle = `rgba(${Math.floor(v * v * 160)}, ${Math.floor(
              100 + v * 155,
            )}, ${Math.floor(60 + v * 60)}, ${a})`;
          }
          ctx!.fillText(glyph, c * cell, r * cell);
        }
        // 밝은 영역일수록 비가 빨리 내리는 느낌
        const headLum = lums[Math.min(rows - 1, Math.max(0, head)) * cols + c];
        drops[c] += headLum > 0.3 || Math.random() < 0.75 ? 1 : 0;
        if (drops[c] >= rows && Math.random() > 0.95) drops[c] = 0;
        if (drops[c] >= rows + 8) drops[c] = 0;
      }
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [running]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black">
      <video ref={videoRef} playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="absolute inset-0" />

      {!running ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center">
          <p className="font-mono text-3xl font-bold tracking-[0.3em] text-[#3aff6e]">
            MATRIX CAM
          </p>
          <p className="font-mono text-[13px] leading-relaxed text-[#3aff6e]/70">
            카메라에 비친 모습이 초록 코드 비로 흘러내립니다.
          </p>
          <button
            onClick={() => start("user")}
            className="rounded-full border border-[#3aff6e] px-8 py-3 font-mono text-sm font-bold tracking-widest text-[#3aff6e] transition hover:bg-[#3aff6e]/10"
          >
            ENTER THE MATRIX
          </button>
          {error ? (
            <p className="font-mono text-[12px] text-red-400">{error}</p>
          ) : null}
        </div>
      ) : (
        <button
          onClick={() =>
            start(facingRef.current === "user" ? "environment" : "user")
          }
          className="absolute bottom-5 right-5 rounded-full border border-[#3aff6e]/50 px-4 py-2 font-mono text-[12px] text-[#3aff6e]/80 backdrop-blur hover:bg-[#3aff6e]/10"
        >
          카메라 전환
        </button>
      )}
    </div>
  );
}
