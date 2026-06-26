import { NextResponse } from "next/server";
import {
  CONTROL_COOKIE,
  CONTROL_COOKIE_TTL_SECONDS,
  createControlToken,
  verifyControlPassword,
} from "@/lib/control-auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { password?: string }
    | null;
  if (!body?.password) {
    return NextResponse.json(
      { error: "비밀번호를 입력해주세요." },
      { status: 400 },
    );
  }
  if (!verifyControlPassword(body.password)) {
    return NextResponse.json(
      { error: "비밀번호가 일치하지 않습니다." },
      { status: 401 },
    );
  }
  const token = await createControlToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: CONTROL_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: CONTROL_COOKIE_TTL_SECONDS,
  });
  return res;
}
