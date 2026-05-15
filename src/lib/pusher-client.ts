"use client";

import Pusher from "pusher-js";

let _pusher: Pusher | null = null;

export function getPusherClient(): Pusher | null {
  if (typeof window === "undefined") return null;
  if (_pusher) return _pusher;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "ap3";
  if (!key) {
    console.warn(
      "NEXT_PUBLIC_PUSHER_KEY가 설정되지 않아 실시간 구독이 비활성화됩니다.",
    );
    return null;
  }
  _pusher = new Pusher(key, { cluster, forceTLS: true });
  return _pusher;
}
