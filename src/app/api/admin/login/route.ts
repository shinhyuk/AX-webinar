import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_TTL_SECONDS,
  createAdminToken,
  verifyAdminPassword,
} from "@/lib/auth";

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
  if (!verifyAdminPassword(body.password)) {
    return NextResponse.json(
      { error: "비밀번호가 일치하지 않습니다." },
      { status: 401 },
    );
  }
  const token = await createAdminToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: ADMIN_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_TTL_SECONDS,
  });
  return res;
}
