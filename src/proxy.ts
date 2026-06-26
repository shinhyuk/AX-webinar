import { NextResponse, type NextRequest } from "next/server";
import { CONTROL_COOKIE, verifyControlToken } from "@/lib/control-auth";

export const config = {
  matcher: ["/control/:path*"],
};

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (pathname.startsWith("/control/login")) {
    return NextResponse.next();
  }
  const token = req.cookies.get(CONTROL_COOKIE)?.value;
  if (await verifyControlToken(token)) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = "/control/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}
