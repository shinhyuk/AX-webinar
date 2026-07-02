import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select("id, nickname, content, answer, model, status, created_at, answered_at")
    .in("status", ["chat", "answered"])
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) {
    return NextResponse.json(
      { error: "메시지를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
  return NextResponse.json({ messages: data ?? [] });
}
