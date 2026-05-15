import { NextResponse } from "next/server";
import { CHAT_HISTORY_LIMIT, CHAT_MAX_STORED, K, getRedis } from "@/lib/kv";
import { CH, EV, getPusherServer } from "@/lib/pusher-server";
import type { ChatMessage } from "@/lib/types";
import { ChatMessageInput } from "@/lib/validation";

export const runtime = "nodejs";

function parseStored(raw: unknown): ChatMessage | null {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ChatMessage;
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === "object") return raw as ChatMessage;
  return null;
}

export async function GET() {
  const redis = getRedis();
  const items = await redis.lrange(K.chatMessages, 0, CHAT_HISTORY_LIMIT - 1);
  const messages = items
    .map(parseStored)
    .filter((m): m is ChatMessage => m !== null)
    .reverse();
  return NextResponse.json({ messages });
}

async function checkRateLimit(userId: string): Promise<boolean> {
  const redis = getRedis();
  const key = K.chatRate(userId);
  const n = await redis.incr(key);
  if (n === 1) await redis.expire(key, 10);
  return n <= 30;
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = ChatMessageInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다." },
      { status: 400 },
    );
  }
  const { userId, nickname, text } = parsed.data;
  if (!(await checkRateLimit(userId))) {
    return NextResponse.json(
      { error: "잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }
  const message: ChatMessage = {
    id: crypto.randomUUID(),
    userId,
    nickname,
    text,
    ts: Date.now(),
  };
  const redis = getRedis();
  await redis.lpush(K.chatMessages, JSON.stringify(message));
  await redis.ltrim(K.chatMessages, 0, CHAT_MAX_STORED - 1);
  await getPusherServer().trigger(CH.chat, EV.newMessage, message);
  return NextResponse.json({ message });
}
