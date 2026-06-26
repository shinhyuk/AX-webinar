import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select("id, nickname, content, classification, answer, answered_at")
    .eq("status", "answered")
    .order("answered_at", { ascending: true })
    .limit(200);
  if (error) {
    return NextResponse.json(
      { error: "메시지를 불러오지 못했습니다." },
      { status: 500 },
    );
  }
  return NextResponse.json({ messages: data ?? [] });
}
