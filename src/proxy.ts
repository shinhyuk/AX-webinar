import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/auth";

export const config = {
  matcher: ["/admin/:path*"],
};

export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin/login")) {
    return NextResponse.next();
  }
  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  if (await verifyAdminToken(token)) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}
