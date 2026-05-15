import { NextResponse } from "next/server";
import { K, getRedis } from "@/lib/kv";
import { CH, EV, getPusherServer } from "@/lib/pusher-server";
import {
  EMPTY_REACTION_COUNTS,
  STATUS_KEYS,
  type ReactionCounts,
  type StatusKey,
} from "@/lib/types";
import { ReactionInput } from "@/lib/validation";

export const runtime = "nodejs";

function isStatusKey(v: unknown): v is StatusKey {
  return typeof v === "string" && (STATUS_KEYS as readonly string[]).includes(v);
}

async function loadCounts(): Promise<ReactionCounts> {
  const redis = getRedis();
  const raw = (await redis.hgetall<Record<string, number | string>>(
    K.reactionsCounts,
  )) ?? {};
  const counts = { ...EMPTY_REACTION_COUNTS };
  for (const k of STATUS_KEYS) {
    const v = raw[k];
    const n = typeof v === "number" ? v : Number(v ?? 0);
    counts[k] = Number.isFinite(n) && n > 0 ? n : 0;
  }
  return counts;
}

export async function GET() {
  const counts = await loadCounts();
  const total = STATUS_KEYS.reduce((sum, k) => sum + counts[k], 0);
  return NextResponse.json({ counts, total });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = ReactionInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다." },
      { status: 400 },
    );
  }
  const { userId, status } = parsed.data;
  const redis = getRedis();
  const prev = await redis.hget<unknown>(K.reactionsByUser, userId);
  const prevStatus = isStatusKey(prev) ? prev : null;
  if (prevStatus === status) {
    const counts = await loadCounts();
    const total = STATUS_KEYS.reduce((sum, k) => sum + counts[k], 0);
    return NextResponse.json({ counts, total, mine: status });
  }
  await redis.hset(K.reactionsByUser, { [userId]: status });
  if (prevStatus) {
    await redis.hincrby(K.reactionsCounts, prevStatus, -1);
  }
  await redis.hincrby(K.reactionsCounts, status, 1);
  const counts = await loadCounts();
  const total = STATUS_KEYS.reduce((sum, k) => sum + counts[k], 0);
  await getPusherServer().trigger(CH.reactions, EV.reactionsUpdated, {
    counts,
    total,
  });
  return NextResponse.json({ counts, total, mine: status });
}
