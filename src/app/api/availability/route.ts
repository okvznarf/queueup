import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/lib/availability";

export async function GET(request: NextRequest) {
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