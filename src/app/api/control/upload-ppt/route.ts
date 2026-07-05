import { NextResponse } from "next/server";
import { CONTROL_COOKIE, verifyControlToken } from "@/lib/control-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "ppt";
const MAX_BYTES = 40 * 1024 * 1024; // 40MB

function readCookie(req: Request): string | undefined {
  const cookieHeader = req.headers.get("cookie") ?? "";
  return cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${CONTROL_COOKIE}=`))
    ?.slice(CONTROL_COOKIE.length + 1);
}

function officeViewerUrl(publicUrl: string): string {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(publicUrl)}`;
}

export async function POST(req: Request) {
  if (!(await verifyControlToken(readCookie(req)))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "파일이 없습니다." },
      { status: 400 },
    );
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "파일이 없습니다." },
      { status: 400 },
    );
  }
  const name = file.name || "presentation.pptx";
  const lower = name.toLowerCase();
  const isPdf = lower.endsWith(".pdf");
  if (!isPdf && !lower.endsWith(".pptx") && !lower.endsWith(".ppt")) {
    return NextResponse.json(
      { error: ".ppt, .pptx 또는 .pdf 파일만 업로드 가능합니다." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `파일 크기가 너무 큽니다 (최대 ${MAX_BYTES / 1024 / 1024}MB).` },
      { status: 413 },
    );
  }

  const supabase = getSupabaseAdmin();

  // 버킷은 마이그레이션에서 만들어져 있어야 함
  const safeName = name.replace(/[^\w.\-]/g, "_");
  const objectPath = `${Date.now()}-${safeName}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, arrayBuffer, {
      contentType:
        file.type ||
        (isPdf
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `업로드 실패: ${uploadError.message}` },
      { status: 500 },
    );
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(objectPath);
  const publicUrl = publicData.publicUrl;
  // PDF는 자체 뷰어(리모컨 페이지 넘김 지원)로 렌더링하므로 원본 URL을 그대로 저장
  const embedUrl = isPdf ? publicUrl : officeViewerUrl(publicUrl);

  await supabase
    .from("config")
    .upsert({
      id: 1,
      ppt_embed_url: embedUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);

  return NextResponse.json({
    ok: true,
    publicUrl,
    embedUrl,
  });
}
