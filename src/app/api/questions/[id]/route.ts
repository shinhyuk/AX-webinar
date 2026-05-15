import { NextResponse } from "next/server";
import { K, getRedis } from "@/lib/kv";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";
import { CH, EV, getPusherServer } from "@/lib/pusher-server";
import type { Question } from "@/lib/types";

export const runtime = "nodejs";

async function isAdmin(req: Request): Promise<boolean> {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${ADMIN_COOKIE}=`));
  if (!match) return false;
  const value = decodeURIComponent(match.split("=").slice(1).join("="));
  return verifyAdminToken(value);
}

async function readQuestion(id: string): Promise<Question | null> {
  const redis = getRedis();
  const raw = await redis.hget<unknown>(K.questionsAll, id);
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Question;
    } catch {
      return null;
    }
  }
  return raw as Question;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as
    | { answered?: boolean }
    | null;
  if (!body || typeof body.answered !== "boolean") {
    return NextResponse.json(
      { error: "answered 값이 필요합니다." },
      { status: 400 },
    );
  }
  const current = await readQuestion(id);
  if (!current) {
    return NextResponse.json(
      { error: "질문을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  const redis = getRedis();
  const updated: Question = body.answered
    ? { ...current, answered: true, answeredAt: Date.now() }
    : { ...current, answered: false, answeredAt: undefined };
  await redis.hset(K.questionsAll, { [id]: JSON.stringify(updated) });
  if (body.answered) {
    await redis.zrem(K.questionsPending, id);
    await redis.zadd(K.questionsAnswered, {
      score: updated.answeredAt!,
      member: id,
    });
  } else {
    await redis.zrem(K.questionsAnswered, id);
    await redis.zadd(K.questionsPending, { score: updated.ts, member: id });
  }
  await getPusherServer().trigger(CH.questions, EV.questionUpdated, updated);
  return NextResponse.json({ question: updated });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const { id } = await ctx.params;
  const redis = getRedis();
  await Promise.all([
    redis.hdel(K.questionsAll, id),
    redis.zrem(K.questionsPending, id),
    redis.zrem(K.questionsAnswered, id),
  ]);
  await getPusherServer().trigger(CH.questions, EV.questionDeleted, { id });
  return NextResponse.json({ ok: true });
}
