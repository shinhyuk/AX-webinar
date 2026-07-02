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

export async function POST(req: Request) {
  if (!(await verifyControlToken(readCookie(req)))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("messages")
    .delete()
    .not("id", "is", null);

  if (error) {
    return NextResponse.json(
      { error: "초기화에 실패했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
