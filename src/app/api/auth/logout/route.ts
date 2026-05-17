import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/security";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("logout:" + ip, 10, 60000)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  response.cookies.set("customer_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
