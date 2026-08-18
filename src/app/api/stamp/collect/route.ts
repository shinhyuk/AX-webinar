import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { findBooth } from "@/lib/stamp";

export const runtime = "nodejs";

/** QR 스캔으로 도장 수집. clientId(기기 식별자) + booth + code 검증 후 저장.
 *  같은 부스는 한 번만 기록된다 (unique 제약). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    clientId?: string;
    booth?: string;
    code?: string;
  } | null;

  const clientId = body?.clientId?.trim() ?? "";
  if (!clientId || clientId.length > 64) {
    return NextResponse.json({ error: "invalid clientId" }, { status: 400 });
  }
  const booth = findBooth(body?.booth);
  if (!booth || body?.code !== booth.code) {
    return NextResponse.json(
      { error: "유효하지 않은 QR 코드예요." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { error: insertError } = await supabase
    .from("stamp_visits")
    .upsert(
      { client_id: clientId, booth: booth.id },
      { onConflict: "client_id,booth", ignoreDuplicates: true },
    );
  if (insertError) {
    return NextResponse.json(
      { error: `저장 실패: ${insertError.message}` },
      { status: 500 },
    );
  }

  const { data, error } = await supabase
    .from("stamp_visits")
    .select("booth, created_at")
    .eq("client_id", clientId);
  if (error) {
    return NextResponse.json(
      { error: `조회 실패: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, stamped: booth.id, collected: data });
}
