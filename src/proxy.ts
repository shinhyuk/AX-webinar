import { NextResponse, type NextRequest } from "next/server";
import { CONTROL_COOKIE, verifyControlToken } from "@/lib/control-auth";

export const config = {
  matcher: ["/", "/control/:path*"],
};

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // cam.hrax.app → /cam (매트릭스 캠)
  const host = req.headers.get("host") ?? "";
  if (host.startsWith("cam.")) {
    const url = req.nextUrl.clone();
    url.pathname = "/cam";
    return NextResponse.rewrite(url);
  }
  if (pathname === "/") {
    return NextResponse.next();
  }

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
