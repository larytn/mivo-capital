import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "mivo-secret-key"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
      JWT_SECRET
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