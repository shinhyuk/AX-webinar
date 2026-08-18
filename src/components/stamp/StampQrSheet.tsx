"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BOOTHS } from "@/lib/stamp";

/** 운영진용: 부스별 QR 코드 인쇄 페이지. 각 QR을 잘라서 해당 부스에 붙여 두면 된다. */
export function StampQrSheet() {
  const [origin, setOrigin] = useState<string | null>(null);
  const [resetState, setResetState] = useState<
    "idle" | "working" | "done" | "unauthorized" | "error"
  >("idle");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function resetAll() {
    if (
      !window.confirm(
        "정말 전체 스탬프를 초기화할까요?\n모든 참가자의 도장 기록이 삭제되며 되돌릴 수 없어요.",
      )
    ) {
      return;
    }
    setResetState("working");
    try {
      const res = await fetch("/api/stamp/reset", { method: "POST" });
      if (res.status === 401) {
        setResetState("unauthorized");
        return;
      }
      setResetState(res.ok ? "done" : "error");
    } catch {
      setResetState("error");
    }
  }

  return (
    <div className="min-h-[100dvh] bg-white px-6 py-10 text-slate-800">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-center text-2xl font-extrabold text-[#4638a8]">
          어슬렁 타운홀 스탬프 미션 — 부스 QR (운영진용)
        </h1>
        <p className="mt-2 text-center text-[13px] text-slate-500 print:hidden">
          이 페이지를 인쇄한 뒤 QR을 잘라 각 부스에 붙여 주세요. 참가자가
          스캔하면 해당 부스 도장이 찍힙니다.
        </p>
        <div className="mt-4 text-center print:hidden">
          <button
            onClick={() => window.print()}
            className="rounded-full bg-[#6d5df0] px-5 py-2 text-sm font-semibold text-white hover:bg-[#5b4be0]"
          >
            인쇄하기
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          {BOOTHS.map((booth) => {
            const url = origin
              ? `${origin}/stamp?b=${booth.id}&k=${booth.code}`
              : null;
            return (
              <div
                key={booth.id}
                className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 p-6"
                style={{ breakInside: "avoid" }}
              >
                <p className="text-lg font-bold text-slate-800">{booth.name}</p>
                {url ? (
                  <>
                    <QRCodeSVG value={url} size={220} marginSize={2} />
                    <p className="break-all text-center text-[11px] text-slate-400">
                      {url}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">준비 중...</p>
                )}
              </div>
            );
          })}
        </div>

        {/* 전체 초기화 (control 로그인한 운영진만 실행 가능) */}
        <div className="mt-10 text-center print:hidden">
          <button
            onClick={resetAll}
            disabled={resetState === "working"}
            className="rounded-full border border-[#e0455a] px-5 py-2 text-sm font-semibold text-[#e0455a] hover:bg-[#e0455a]/5 disabled:opacity-50"
          >
            {resetState === "working" ? "초기화 중..." : "전체 스탬프 초기화"}
          </button>
          {resetState === "done" ? (
            <p className="mt-2 text-[12px] font-semibold text-emerald-600">
              전체 스탬프가 초기화되었어요.
            </p>
          ) : null}
          {resetState === "unauthorized" ? (
            <p className="mt-2 text-[12px] text-[#e0455a]">
              운영진 로그인이 필요해요.{" "}
              <a href="/control/login" className="underline">
                /control/login
              </a>
              에서 로그인한 뒤 다시 시도해 주세요.
            </p>
          ) : null}
          {resetState === "error" ? (
            <p className="mt-2 text-[12px] text-[#e0455a]">
              초기화에 실패했어요. 잠시 후 다시 시도해 주세요.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
