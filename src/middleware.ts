import { NextRequest, NextResponse } from "next/server";


export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("accessToken")?.value;
  const role = request.cookies.get("userRole")?.value;

  // 1. Protect Admin routes
  if (pathname.startsWith("/admin")) {
    if (!token || (role !== "ADMIN" && role !== "STAFF")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Redirect logged-in admin/staff away from public login/register
  if ((pathname === "/login" || pathname === "/register") && token) {
    if (role === "ADMIN" || role === "STAFF") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/register"],
};

// Yes. I would separate these into two different pages:

// Dashboard → quick overview, like the screenshot: KPI cards + main trend chart + popular movies + hall/cinema summary.
// Analytics → deeper reporting: daily/monthly/yearly revenue, peak hours, hall utilization, movie rankings.

// The important difference is that the Dashboard answers “How is the cinema doing?”, while Analytics answers “Why/how is it doing that?”