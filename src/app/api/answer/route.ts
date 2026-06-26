import { NextResponse } from "next/server";
import { generateAnswer } from "@/lib/answer";
import { CONTROL_COOKIE, verifyControlToken } from "@/lib/control-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  // 운영자만 호출 가능 (재시도/수동 처리 용도)
  const cookieHeader = req.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONTROL_COOKIE}=`))
    ?.slice(CONTROL_COOKIE.length + 1);
  if (!(await verifyControlToken(token))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { messageId?: string }
    | null;
  const messageId = body?.messageId;
  if (!messageId) {
    return NextResponse.json(
      { error: "messageId가 필요합니다." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: msg, error: msgError } = await supabase
    .from("messages")
    .select("id, content, status, classification")
    .eq("id", messageId)
    .maybeSingle();
  if (msgError || !msg) {
    return NextResponse.json(
      { error: "메시지를 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (msg.status !== "approved" && msg.status !== "pending") {
    return NextResponse.json(
      { error: `상태가 ${msg.status}여서 답변을 생성할 수 없습니다.` },
      { status: 409 },
    );
  }

  const { data: cfg } = await supabase
    .from("config")
    .select("kb_text")
    .eq("id", 1)
    .maybeSingle();

  const question =
    msg.classification?.normalized_question?.trim() || msg.content;
  let answer: string;
  try {
    answer = await generateAnswer(question, cfg?.kb_text ?? null);
  } catch {
    return NextResponse.json(
      { error: "답변 생성에 실패했습니다." },
      { status: 500 },
    );
  }

  const now = new Date().toISOString();
  await supabase
    .from("messages")
    .update({
      status: "answered",
      answer,
      approved_at: msg.status === "approved" ? undefined : now,
      answered_at: now,
    })
    .eq("id", messageId);

  return NextResponse.json({ ok: true });
}
