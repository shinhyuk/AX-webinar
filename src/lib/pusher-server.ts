import Pusher from "pusher";

let _pusher: Pusher | null = null;

export function getPusherServer(): Pusher {
  if (_pusher) return _pusher;
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER ?? "ap3";
  if (!appId || !key || !secret) {
    throw new Error(
      "Pusher 자격증명이 없습니다. PUSHER_APP_ID / PUSHER_KEY / PUSHER_SECRET 환경변수를 설정하세요.",
    );
  }
  _pusher = new Pusher({ appId, key, secret, cluster, useTLS: true });
  return _pusher;
}

export const CH = {
  chat: "chat",
  questions: "questions",
  reactions: "reactions",
  admin: "admin",
  presence: "presence-webinar",
} as const;

export const EV = {
  newMessage: "new-message",
  newQuestion: "new-question",
  questionUpdated: "updated",
  questionDeleted: "deleted",
  reactionsUpdated: "updated",
  adminReset: "reset",
} as const;
