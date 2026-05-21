import { NextResponse } from "next/server";
import { getPusherServer } from "@/lib/pusher-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    socket_id?: string;
    channel_name?: string;
    identity?: { userId?: string; nickname?: string; role?: string };
  } | null;

  const socketId = body?.socket_id;
  const channel = body?.channel_name;
  if (!socketId || !channel) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  if (!channel.startsWith("presence-")) {
    return NextResponse.json({ error: "허용되지 않은 채널" }, { status: 403 });
  }

  const id = body?.identity;
  const userId =
    typeof id?.userId === "string" && id.userId.length > 0
      ? id.userId
      : `anon-${socketId}`;
  const role = id?.role === "admin" ? "admin" : "participant";
  const nickname =
    typeof id?.nickname === "string" && id.nickname.length > 0
      ? id.nickname
      : "익명";

  const auth = getPusherServer().authorizeChannel(socketId, channel, {
    user_id: userId,
    user_info: { nickname, role },
  });
  return NextResponse.json(auth);
}
