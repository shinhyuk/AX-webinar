import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_LEN = 500;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { content?: string; nickname?: string | null }
    | null;
  const content = (body?.content ?? "").trim();
  const nicknameRaw = (body?.nickname ?? "").toString().trim();
  if (!content) {
    return NextResponse.json(
      { error: "메시지를 입력해주세요." },
      { status: 400 },
    );
  }
  if (content.length > MAX_LEN) {
    return NextResponse.json(
      { error: `메시지는 ${MAX_LEN}자 이하로 입력해주세요.` },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: inserted, error: insertError } = await supabase
    .from("messages")
    .insert({
      nickname: nicknameRaw || null,
      content,
      status: "chat",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "저장에 실패했어요. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
