import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";
import { rateLimit } from "@/lib/security";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("avail:" + ip, 60, 60000)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const shopId = request.nextUrl.searchParams.get("shopId");
  const date = request.nextUrl.searchParams.get("date");
  const staffId = request.nextUrl.searchParams.get("staffId");
  const duration = request.nextUrl.searchParams.get("duration");

  if (!shopId || !date) {
    return NextResponse.json({ error: "shopId and date required" }, { status: 400 });
  }

  try {
    const slots = await getAvailableSlots(
      shopId,
      new Date(date),
      staffId || null,
      duration ? parseInt(duration) : 30
    );
    return NextResponse.json(slots);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}