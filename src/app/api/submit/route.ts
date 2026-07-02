import { NextResponse, after } from "next/server";
import { generateAnswer } from "@/lib/answer";
import { classifyQuestion } from "@/lib/classify";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_LEN = 500;
const MIN_CLASSIFY_LEN = 5;

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

  const messageId: string = inserted.id;

  // 응답은 즉시 반환하고, 질문 판별 + AI 답변은 백그라운드로 진행
  if (content.length >= MIN_CLASSIFY_LEN) {
    after(async () => {
      try {
        const judgement = await classifyQuestion(content);
        if (!judgement) return;

        await supabase
          .from("messages")
          .update({ classification: judgement })
          .eq("id", messageId);

        if (!judgement.is_question) return;

        const { data: cfg } = await supabase
          .from("config")
          .select("kb_text")
          .eq("id", 1)
          .maybeSingle();

        const result = await generateAnswer(
          content,
          cfg?.kb_text ?? null,
          "opus",
        );

        // 지식 기반에 없어 답변 불가한 질문은 답변을 아예 남기지 않는다
        if (result.usedFallback) return;

        await supabase
          .from("messages")
          .update({
            status: "answered",
            answer: result.answer,
            model: result.modelId,
            answered_at: new Date().toISOString(),
          })
          .eq("id", messageId);
      } catch {
        // 백그라운드 실패는 조용히 무시 (채팅 자체는 이미 표시됨)
      }
    });
  }

  return NextResponse.json({ ok: true, id: messageId });
}
