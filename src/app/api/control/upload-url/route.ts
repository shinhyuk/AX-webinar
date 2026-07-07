import { NextResponse } from "next/server";
import { CONTROL_COOKIE, verifyControlToken } from "@/lib/control-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export const runtime = "nodejs";

const BUCKET = "ppt";

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

/** 브라우저 → Supabase Storage 직접 업로드용 서명 URL 발급.
 *  Vercel 함수 본문 제한(4.5MB)을 우회하기 위해 파일은 서버를 거치지 않는다. */
export async function POST(req: Request) {
  if (!(await verifyControlToken(readCookie(req)))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name || "presentation.pptx";
  const lower = name.toLowerCase();
  const isPdf = lower.endsWith(".pdf");
  if (!isPdf && !lower.endsWith(".pptx") && !lower.endsWith(".ppt")) {
    return NextResponse.json(
      { error: ".ppt, .pptx 또는 .pdf 파일만 업로드 가능합니다." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const safeName = name.replace(/[^\w.\-]/g, "_");
  const objectPath = `${Date.now()}-${safeName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(objectPath);
  if (error || !data) {
    return NextResponse.json(
      { error: `업로드 URL 발급 실패: ${error?.message ?? "unknown"}` },
      { status: 500 },
    );
  }

  const { data: publicData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(objectPath);
  const publicUrl = publicData.publicUrl;
  const embedUrl = isPdf ? publicUrl : officeViewerUrl(publicUrl);

  return NextResponse.json({
    ok: true,
    path: data.path,
    token: data.token,
    publicUrl,
    embedUrl,
  });
}
