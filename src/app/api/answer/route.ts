import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    { error: "답변 생성은 M3에서 구현됩니다." },
    { status: 501 },
  );
}
