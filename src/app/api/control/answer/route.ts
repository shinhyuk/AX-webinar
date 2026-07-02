import { NextResponse } from "next/server";
import { generateAnswer } from "@/lib/answer";
import { CONTROL_COOKIE, verifyControlToken } from "@/lib/control-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import type { AnswerModel } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const VALID_MODELS: AnswerModel[] = ["haiku", "sonnet", "opus"];

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
  const body = (await req.json().catch(() => null)) as
    | { messageId?: string; model?: AnswerModel }
    | null;
  const messageId = body?.messageId;
  const model: AnswerModel = VALID_MODELS.includes(body?.model as AnswerModel)
    ? (body!.model as AnswerModel)
    : "opus";
  if (!messageId) {
    return NextResponse.json(
      { error: "messageId가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: msg, error: msgError } = await supabase
    .from("messages")
    .select("id, content")
    .eq("id", messageId)
    .maybeSingle();
  if (msgError || !msg) {
    return NextResponse.json(
      { error: "메시지를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { data: cfg } = await supabase
    .from("config")
    .select("kb_text")
    .eq("id", 1)
    .maybeSingle();

  let result: Awaited<ReturnType<typeof generateAnswer>>;
  try {
    result = await generateAnswer(msg.content, cfg?.kb_text ?? null, model);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "답변 생성에 실패했습니다." },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  await supabase
    .from("messages")
    .update({
      status: "answered",
      answer: result.answer,
      model: result.modelId,
      answered_at: now,
    })
    .eq("id", messageId);

  return NextResponse.json({
    ok: true,
    answer: result.answer,
    modelId: result.modelId,
    usedFallback: result.usedFallback,
  });
}
