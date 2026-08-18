import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

/** 기기(clientId)별 수집 현황 조회 — 새로고침/재접속해도 스탬프 유지 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId")?.trim() ?? "";
  if (!clientId || clientId.length > 64) {
    return NextResponse.json({ error: "invalid clientId" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("stamp_visits")
    .select("booth, created_at")
    .eq("client_id", clientId);
  if (error) {
    return NextResponse.json(
      { error: `조회 실패: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, collected: data });
}
