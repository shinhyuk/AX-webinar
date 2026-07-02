import { NextResponse } from "next/server";
import { CONTROL_COOKIE, verifyControlToken } from "@/lib/control-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONTROL_COOKIE}=`))
    ?.slice(CONTROL_COOKIE.length + 1);

  if (!(await verifyControlToken(token))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, created_at, nickname, content, status, classification, answer, model, approved_at, answered_at",
    )
    .in("status", ["chat", "answered", "queued", "approved", "rejected"])
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json(
      { error: "메시지를 불러오지 못했습니다." },
      { status: 500 },
    );
  }

  return NextResponse.json({ messages: data ?? [] });
}
