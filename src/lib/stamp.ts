/** 어슬렁 타운홀 스탬프 랠리 부스 정의.
 *  code는 QR에만 실리는 수집 코드 — URL을 손으로 추측해 도장 찍는 것을 막는 용도. */
export const BOOTHS = [
  { id: "snack", name: "출출세포의 간식타임", code: "sn4k2t" },
  { id: "lab", name: "줄기세포 Lab", code: "lb7x9q" },
  { id: "explore", name: "호기심세포 탐험대", code: "ex3m8r" },
  { id: "leader", name: "리더세포 도전일기", code: "ld5w1p" },
  { id: "ca", name: "CA를 찾아라!", code: "ca6z4h" },
] as const;

export type BoothId = (typeof BOOTHS)[number]["id"];

export function findBooth(id: string | null | undefined) {
  return BOOTHS.find((b) => b.id === id) ?? null;
}
