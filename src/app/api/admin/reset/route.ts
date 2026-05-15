import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";
import { K, getRedis } from "@/lib/kv";
import { CH, EV, getPusherServer } from "@/lib/pusher-server";

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

export async function POST(req: Request) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }
  const redis = getRedis();
  await redis.del(
    K.chatMessages,
    K.questionsAll,
    K.questionsPending,
    K.questionsAnswered,
    K.reactionsByUser,
    K.reactionsCounts,
  );
  await getPusherServer().trigger(CH.admin, EV.adminReset, {});
  return NextResponse.json({ ok: true });
}
