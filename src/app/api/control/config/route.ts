import { NextResponse } from "next/server";
import { CONTROL_COOKIE, verifyControlToken } from "@/lib/control-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

function readCookie(req: Request): string | undefined {
  const cookieHeader = req.headers.get("cookie") ?? "";
  return cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONTROL_COOKIE}=`))
    ?.slice(CONTROL_COOKIE.length + 1);
}

export async function GET(req: Request) {
  if (!(await verifyControlToken(readCookie(req)))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("config")
    .select("id, ppt_embed_url, kb_text, topic_desc, updated_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: "설정을 불러오지 못했습니다." },
      { status: 500 },
    );
  }
  return NextResponse.json({
    config: data ?? {
      id: 1,
      ppt_embed_url: null,
      kb_text: null,
      topic_desc: null,
      updated_at: null,
    },
  });
}

export async function PUT(req: Request) {
  if (!(await verifyControlToken(readCookie(req)))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as
    | {
        ppt_embed_url?: string | null;
        kb_text?: string | null;
        topic_desc?: string | null;
      }
    | null;
  if (!body) {
    return NextResponse.json(
      { error: "잘못된 요청입니다." },
      { status: 400 },
    );
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("config")
    .upsert({
      id: 1,
      ppt_embed_url: body.ppt_embed_url ?? null,
      kb_text: body.kb_text ?? null,
      topic_desc: body.topic_desc ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) {
    return NextResponse.json(
      { error: "설정 저장에 실패했습니다." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
