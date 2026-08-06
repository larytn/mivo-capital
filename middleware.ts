import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("token")?.value;

  // Admin login stays public
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  // Protect admin pages
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }

    return NextResponse.next();
  }

  // Protect trader pages
  if (!token) {
    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/accounts/:path*",
    "/challenges/:path*",
    "/withdrawals/:path*",
    "/kyc/:path*",
    "/referrals/:path*",
    "/transactions/:path*",
    "/support/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};