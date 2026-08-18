"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { BOOTHS } from "@/lib/stamp";

/** 운영진용: 부스별 QR 코드 인쇄 페이지. 각 QR을 잘라서 해당 부스에 붙여 두면 된다. */
export function StampQrSheet() {
  const [origin, setOrigin] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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
      </div>
    </div>
  );
}
