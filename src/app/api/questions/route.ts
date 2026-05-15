import { NextResponse } from "next/server";
import { K, getRedis } from "@/lib/kv";
import { CH, EV, getPusherServer } from "@/lib/pusher-server";
import type { Question } from "@/lib/types";
import { QuestionInput } from "@/lib/validation";

export const runtime = "nodejs";

function parseStored(raw: unknown): Question | null {
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Question;
    } catch {
      return null;
    }
  }
  if (raw && typeof raw === "object") return raw as Question;
  return null;
}

async function fetchByIds(ids: string[]): Promise<Question[]> {
  if (ids.length === 0) return [];
  const redis = getRedis();
  const raws = await redis.hmget<Record<string, unknown>>(
    K.questionsAll,
    ...ids,
  );
  if (!raws) return [];
  return ids
    .map((id) => parseStored(raws[id]))
    .filter((q): q is Question => q !== null);
}

export async function GET() {
  const redis = getRedis();
  const [pendingIds, answeredIds] = await Promise.all([
    redis.zrange<string[]>(K.questionsPending, 0, -1, { rev: true }),
    redis.zrange<string[]>(K.questionsAnswered, 0, -1),
  ]);
  const [pending, answered] = await Promise.all([
    fetchByIds(pendingIds),
    fetchByIds(answeredIds),
  ]);
  return NextResponse.json({ pending, answered });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = QuestionInput.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 입력입니다." },
      { status: 400 },
    );
  }
  const { userId, nickname, text } = parsed.data;
  const question: Question = {
    id: crypto.randomUUID(),
    userId,
    nickname,
    text,
    ts: Date.now(),
    answered: false,
  };
  const redis = getRedis();
  await redis.hset(K.questionsAll, { [question.id]: JSON.stringify(question) });
  await redis.zadd(K.questionsPending, { score: question.ts, member: question.id });
  await getPusherServer().trigger(CH.questions, EV.newQuestion, question);
  return NextResponse.json({ question });
}
