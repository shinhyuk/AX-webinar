import { NextResponse } from "next/server";
import { generateAnswer } from "@/lib/answer";
import { classify } from "@/lib/classify";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 30;

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

  const messageId: string = inserted.id;

  const { data: cfg } = await supabase
    .from("config")
    .select("topic_desc, kb_text")
    .eq("id", 1)
    .maybeSingle();

  // Haiku 분류
  let classification = null;
  let passes = false;
  try {
    const result = await classify(content, cfg?.topic_desc ?? null);
    classification = result;
    passes = !!(result && result.is_question && result.on_topic && result.safe);
  } catch {
    passes = false;
  }

  if (!passes) {
    await supabase
      .from("messages")
      .update({ status: "rejected", classification })
      .eq("id", messageId);
    return NextResponse.json({ ok: true, accepted: false });
  }

  // Sonnet 답변 생성 (KB 컨텍스트 주입)
  const question = classification?.normalized_question?.trim() || content;
  let answer: string;
  try {
    answer = await generateAnswer(question, cfg?.kb_text ?? null);
  } catch {
    return NextResponse.json(
      { error: "답변 생성에 실패했어요. 잠시 후 다시 시도해주세요." },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  await supabase
    .from("messages")
    .update({
      status: "answered",
      classification,
      answer,
      approved_at: now,
      answered_at: now,
    })
    .eq("id", messageId);

  return NextResponse.json({ ok: true, accepted: true, id: messageId });
}
