import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, day, openTime, closeTime, isClosed } = body;
    if (!shopId) return NextResponse.json({ error: "shopId required" }, { status: 400 });
    const auth = await requireAdmin(request, shopId);
    if (auth.error) return auth.error;
    const hours = await prisma.workingHours.upsert({
      where: { shopId_day: { shopId, day } },
      update: { openTime, closeTime, isClosed },
      create: { shopId, day, openTime, closeTime, isClosed },
    });
    return NextResponse.json(hours);
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
