import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("accessToken")?.value;
  const role = request.cookies.get("userRole")?.value;

  // ============================================================
  // 1. PROTECT ADMIN ROUTES
  // ============================================================
  if (pathname.startsWith("/admin")) {
    // No token -> go to login
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);

      return NextResponse.redirect(loginUrl);
    }

    // Only ADMIN and STAFF can access admin pages
    if (role !== "ADMIN" && role !== "STAFF") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ============================================================
  // 2. LOGIN AND REGISTER MUST ALWAYS BE ACCESSIBLE
  // ============================================================
  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.next();
  }

  // ============================================================
  // 3. ALLOW REQUEST
  // ============================================================
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/register"],
};
