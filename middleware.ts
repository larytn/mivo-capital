import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin login must always be accessible
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Protect admin pages
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("token")?.value;

    if (!token) {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};