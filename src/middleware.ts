import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : ""} https://accounts.google.com https://apis.google.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
    "frame-src https://accounts.google.com",
  ].join("; ");
  response.headers.set("Content-Security-Policy", csp);

  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Reject oversized payloads (100KB max)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 102400) {
      return new NextResponse(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { "Content-Type": "application/json" },
      });
    }

    const origin = request.headers.get("origin") || "";
    const allowedOrigins = [
      "http://localhost:3000",
      "https://queueup.me",
      "https://www.queueup.me",
      process.env.NEXTAUTH_URL || "",
    ].filter(Boolean);
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (request.method === "OPTIONS") return new NextResponse(null, { status: 200, headers: response.headers });

    // CSRF: reject state-changing requests from unknown origins
    if (["POST", "PATCH", "DELETE"].includes(request.method)) {
      // Cron endpoints use Authorization header, not cookies — exempt from origin check
      if (!request.nextUrl.pathname.startsWith("/api/cron/")) {
        if (origin && !allowedOrigins.includes(origin)) {
          return new NextResponse(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
        }
      }
    }
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