import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isValidTime } from "@/lib/security";

const DAYS = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, day, openTime, closeTime, isClosed } = body;
    if (!shopId) return NextResponse.json({ error: "shopId required" }, { status: 400 });
    const dayEnum = typeof day === "number" ? DAYS[day] : (typeof day === "string" && DAYS.includes(day as any) ? day : undefined);
    if (!dayEnum) return NextResponse.json({ error: "Invalid day" }, { status: 400 });
    if (typeof isClosed !== "boolean") return NextResponse.json({ error: "isClosed must be boolean" }, { status: 400 });
    if (!isClosed) {
      if (!isValidTime(openTime)) return NextResponse.json({ error: "Invalid openTime (HH:MM)" }, { status: 400 });
      if (!isValidTime(closeTime)) return NextResponse.json({ error: "Invalid closeTime (HH:MM)" }, { status: 400 });
    }
    const auth = await requireAdmin(request, shopId);
    if (auth.error) return auth.error;
    const hours = await prisma.workingHours.upsert({
      where: { shopId_day: { shopId, day: dayEnum as any } },
      update: { openTime: openTime || "09:00", closeTime: closeTime || "17:00", isClosed },
      create: { shopId, day: dayEnum as any, openTime: openTime || "09:00", closeTime: closeTime || "17:00", isClosed },
    });
    return NextResponse.json(hours);
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
