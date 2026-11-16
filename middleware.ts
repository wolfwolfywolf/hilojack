import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, tokenValid } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isAdminPath = pathname.startsWith("/admin");
  const loginPath = isAdminPath ? "/admin/login" : "/login";
  if (pathname === "/login" || pathname === "/admin/login") return NextResponse.next();

  const adminOk = await tokenValid("admin", req.cookies.get(COOKIE.admin)?.value);
  const ok = isAdminPath
    ? adminOk
    : adminOk || (await tokenValid("viewer", req.cookies.get(COOKIE.viewer)?.value));
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = loginPath;
  url.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt).*)"],
};
