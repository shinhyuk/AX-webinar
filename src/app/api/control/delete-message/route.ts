import { NextResponse } from "next/server";
import { CONTROL_COOKIE, verifyControlToken } from "@/lib/control-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

function readCookie(req: Request): string | undefined {
  const cookieHeader = req.headers.get("cookie") ?? "";
  return cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONTROL_COOKIE}=`))
    ?.slice(CONTROL_COOKIE.length + 1);
}

/** 개별 메시지 삭제 (운영자 전용). Realtime DELETE 이벤트로
 *  청중/무대 화면에서도 즉시 사라진다. */
export async function POST(req: Request) {
  if (!(await verifyControlToken(readCookie(req)))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    messageId?: string;
  } | null;
  const messageId = body?.messageId;
  if (!messageId) {
    return NextResponse.json(
      { error: "messageId가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("messages").delete().eq("id", messageId);
  if (error) {
    return NextResponse.json(
      { error: `삭제 실패: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
