import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin") || "";
    const allowedOrigins = ["http://localhost:3000", process.env.NEXTAUTH_URL || ""].filter(Boolean);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV === "development") {
      response.headers.set("Access-Control-Allow-Origin", origin || "*");
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (request.method === "OPTIONS") return new NextResponse(null, { status: 200, headers: response.headers });
  }

  if (request.nextUrl.pathname.startsWith("/admin/") && !request.nextUrl.pathname.startsWith("/admin/login")) {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (request.nextUrl.pathname.startsWith("/fran/") && !request.nextUrl.pathname.startsWith("/fran/login")) {
    const token = request.cookies.get("auth_token")?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/fran/login", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/fran/:path*", "/api/:path*"],
};