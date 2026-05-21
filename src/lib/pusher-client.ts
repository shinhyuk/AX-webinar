"use client";

import Pusher from "pusher-js";

export type PusherIdentity = {
  userId: string;
  nickname: string;
  role: "participant" | "admin";
};

let _pusher: Pusher | null = null;
let _identity: PusherIdentity | null = null;

export function setPusherIdentity(identity: PusherIdentity) {
  _identity = identity;
}

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
  _pusher = new Pusher(key, {
    cluster,
    forceTLS: true,
    channelAuthorization: {
      endpoint: "/api/pusher/auth",
      transport: "ajax",
      customHandler: ({ socketId, channelName }, callback) => {
        fetch("/api/pusher/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channelName,
            identity: _identity,
          }),
        })
          .then((res) =>
            res.ok ? res.json() : Promise.reject(new Error("auth failed")),
          )
          .then((data) => callback(null, data))
          .catch((err) => callback(err as Error, null));
      },
    },
  });
  return _pusher;
}
