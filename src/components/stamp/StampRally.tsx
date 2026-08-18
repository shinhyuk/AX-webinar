"use client";

import { useEffect, useState } from "react";
import { BOOTHS } from "@/lib/stamp";

const CLIENT_KEY = "stamp.clientId";

function getClientId(): string {
  let v = localStorage.getItem(CLIENT_KEY);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(CLIENT_KEY, v);
  }
  return v;
}

type Collected = { booth: string; created_at: string };

export function StampRally() {
  const [collected, setCollected] = useState<Collected[] | null>(null);
  const [justStamped, setJustStamped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const clientId = getClientId();
        const params = new URLSearchParams(window.location.search);
        const b = params.get("b");
        const k = params.get("k");

        if (b && k) {
          // QR 스캔 진입 — 도장 수집 후 URL 정리
          const res = await fetch("/api/stamp/collect", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId, booth: b, code: k }),
          });
          const j = (await res.json().catch(() => ({}))) as {
            collected?: Collected[];
            stamped?: string;
            error?: string;
          };
          window.history.replaceState(null, "", "/stamp");
          if (!res.ok) throw new Error(j.error ?? "수집 실패");
          if (cancelled) return;
          setCollected(j.collected ?? []);
          setJustStamped(j.stamped ?? null);
        } else {
          const res = await fetch(
            `/api/stamp/status?clientId=${encodeURIComponent(clientId)}`,
            { cache: "no-store" },
          );
          const j = (await res.json().catch(() => ({}))) as {
            collected?: Collected[];
            error?: string;
          };
          if (!res.ok) throw new Error(j.error ?? "불러오기 실패");
          if (cancelled) return;
          setCollected(j.collected ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "오류가 발생했어요");
          setCollected([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const collectedIds = new Set((collected ?? []).map((c) => c.booth));
  const count = collectedIds.size;
  const done = count >= BOOTHS.length;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#c9c2ee] via-[#d9d3f4] to-[#c9d4f2] px-4 py-8 text-slate-800">
      <div className="mx-auto w-full max-w-md rounded-[28px] bg-white/95 px-5 py-7 shadow-[0_20px_60px_rgba(80,70,160,0.35)]">
        {/* 타이틀 */}
        <h1 className="text-center text-[21px] font-extrabold leading-snug text-[#4638a8]">
          경영지원사업부 어슬렁 타운홀
          <br />
          스탬프 미션
        </h1>
        <p className="mt-2.5 text-center text-[13px] leading-relaxed text-slate-500">
          4개 부스 방문과 특별 미션을 모두 수행하여
          <br />
          스탬프를 완성해 보세요!
        </p>

        {/* 진행률 */}
        <div className="mt-6 flex items-center gap-3">
          <span className="shrink-0 text-[13px] font-semibold text-slate-600">
            진행률
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#e7e3f8]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#6d5df0] to-[#9d6df0] transition-all duration-700"
              style={{ width: `${(count / BOOTHS.length) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-[14px] font-bold tabular-nums text-[#4638a8]">
            {count} / {BOOTHS.length}
          </span>
        </div>

        {/* 스탬프 그리드 (3 + 2) */}
        <div className="mt-8 grid grid-cols-6 gap-y-7">
          {BOOTHS.map((booth, i) => {
            const got = collectedIds.has(booth.id);
            const pop = justStamped === booth.id;
            return (
              <div
                key={booth.id}
                className={
                  "col-span-2 flex flex-col items-center gap-2 " +
                  (i === 3 ? "col-start-2" : "")
                }
              >
                {got ? (
                  <div
                    className={
                      "relative flex h-[76px] w-[76px] -rotate-6 items-center justify-center rounded-full border-[3px] border-[#e0455a] " +
                      (pop ? "stamp-pop" : "")
                    }
                  >
                    <div className="absolute inset-[5px] rounded-full border border-[#e0455a]/60" />
                    <div className="text-center leading-tight text-[#e0455a]">
                      <div className="text-xl font-black">✓</div>
                      <div className="text-[10px] font-bold tracking-widest">
                        완료
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex h-[76px] w-[76px] items-center justify-center rounded-full border-2 border-dashed border-[#a99ee0]">
                    <div className="absolute inset-[10px] rounded-full border border-dashed border-[#c3bbec]" />
                  </div>
                )}
                <div className="text-center">
                  <p className="text-[12.5px] font-bold leading-tight text-slate-700">
                    {booth.name}
                  </p>
                  <p
                    className={
                      "mt-0.5 text-[11px] " +
                      (got ? "font-semibold text-[#6d5df0]" : "text-slate-400")
                    }
                  >
                    {got ? "수집 완료" : "미수집"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* 완료 배너 */}
        {done ? (
          <div className="stamp-pop mt-8 rounded-2xl bg-gradient-to-r from-[#6d5df0] to-[#9d6df0] px-4 py-4 text-center text-white shadow-lg">
            <p className="text-lg font-extrabold">🎉 미션 완료!</p>
            <p className="mt-1 text-[13px] opacity-90">
              스탬프 5개를 모두 모았어요. 이 화면을 운영진에게 보여주세요!
            </p>
          </div>
        ) : null}

        {/* 상태/오류 */}
        {collected === null ? (
          <p className="mt-6 text-center text-[12px] text-slate-400">
            불러오는 중...
          </p>
        ) : null}
        {error ? (
          <p className="mt-6 text-center text-[12px] text-[#e0455a]">{error}</p>
        ) : null}

        <p className="mt-7 text-center text-[11px] text-slate-400">
          부스에 있는 QR 코드를 스캔하면 도장이 자동으로 찍혀요.
          <br />
          이 기기 기준으로 저장되어 새로고침해도 유지됩니다.
        </p>
      </div>
    </div>
  );
}
