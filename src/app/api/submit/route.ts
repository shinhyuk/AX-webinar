import { NextResponse } from "next/server";
import { classify } from "@/lib/classify";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

const MAX_LEN = 300;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { content?: string; nickname?: string | null }
    | null;
  const content = (body?.content ?? "").trim();
  const nicknameRaw = (body?.nickname ?? "").toString().trim();
  if (!content) {
    return NextResponse.json(
      { error: "질문을 입력해주세요." },
      { status: 400 },
    );
  }
  if (content.length > MAX_LEN) {
    return NextResponse.json(
      { error: `질문은 ${MAX_LEN}자 이하로 입력해주세요.` },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: inserted, error: insertError } = await supabase
    .from("messages")
    .insert({
      nickname: nicknameRaw || null,
      content,
      status: "pending",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "저장에 실패했어요. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }

  // 설정의 topic_desc 가져오기 (없으면 lib/classify의 기본값)
  const { data: cfg } = await supabase
    .from("config")
    .select("topic_desc")
    .eq("id", 1)
    .maybeSingle();

  let nextStatus: "queued" | "rejected" = "rejected";
  let classification = null;
  try {
    const result = await classify(content, cfg?.topic_desc ?? null);
    classification = result;
    if (result && result.is_question && result.on_topic && result.safe) {
      nextStatus = "queued";
    } else {
      nextStatus = "rejected";
    }
  } catch {
    // 분류 실패 → 안전을 위해 rejected. (운영자가 콘솔에서 보기는 어렵지만 노출도 안 됨)
    nextStatus = "rejected";
  }

  await supabase
    .from("messages")
    .update({
      status: nextStatus,
      classification,
    })
    .eq("id", inserted.id);

  return NextResponse.json({ ok: true });
}
