import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "@/lib/jwt-secret";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const retiredPaths = ["/accounts", "/buy-challenge", "/challenges", "/withdrawals", "/transactions", "/kyc"];
  if (retiredPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const matchesRoot = (roots: string[]) => roots.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const postponedApiPaths = [
    "/api/copy-trading",
    "/api/fund-management",
    "/api/properties",
    "/api/admin/copy-trading",
    "/api/admin/fund-management",
    "/api/admin/properties",
  ];
  if (matchesRoot(postponedApiPaths)) {
    return NextResponse.json({ error: "This feature is planned for a later Mivo release." }, { status: 404 });
  }

  const postponedPagePaths = [
    "/academy",
    "/copy-trading",
    "/fund-management",
    "/real-estate",
    "/admin/copy-trading",
    "/admin/fund-management",
    "/admin/properties",
  ];
  if (matchesRoot(postponedPagePaths)) {
    return NextResponse.redirect(new URL(pathname.startsWith("/admin") ? "/admin" : "/dashboard", request.url));
  }

  // Admin login stays public
  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;

  // No token
  if (!token) {
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(
        new URL("/admin/login", request.url)
      );
    }

    return NextResponse.redirect(
      new URL("/login", request.url)
    );
  }

  // Verify token
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(getJwtSecret())
    );

    // Admin routes require ADMIN role
    if (
      pathname.startsWith("/admin") &&
      payload.role !== "ADMIN"
    ) {
      return NextResponse.redirect(
        new URL("/dashboard", request.url)
      );
    }

    return NextResponse.next();
  } catch {
    // Invalid or expired token
    const response = NextResponse.redirect(
      new URL(
        pathname.startsWith("/admin")
          ? "/admin/login"
          : "/login",
        request.url
      )
    );

    response.cookies.delete("token");

    return response;
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/support/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/community/:path*",
    "/chat/:path*",
    "/journal/:path*",
    "/backtesting/:path*",
    "/academy/:path*",
    "/copy-trading/:path*",
    "/signals/:path*",
    "/announcements/:path*",
    "/real-estate/:path*",
    "/fund-management/:path*",
    "/automation/:path*",
    "/admin/copy-trading/:path*",
    "/admin/fund-management/:path*",
    "/admin/properties/:path*",
    "/api/copy-trading/:path*",
    "/api/fund-management/:path*",
    "/api/properties/:path*",
    "/api/admin/copy-trading/:path*",
    "/api/admin/fund-management/:path*",
    "/api/admin/properties/:path*",
    "/accounts/:path*",
    "/buy-challenge/:path*",
    "/challenges/:path*",
    "/withdrawals/:path*",
    "/transactions/:path*",
    "/kyc/:path*",
  ],
};
