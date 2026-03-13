import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const shopId = request.nextUrl.searchParams.get("shopId");
  if (!shopId) {
    return NextResponse.json({ error: "shopId is required" }, { status: 400 });
  }
  try {
    const staff = await prisma.staff.findMany({
      where: { shopId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(staff);
  } catch (error) {
    console.error("Error fetching staff:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, name, email, phone, role, bio } = body;
    if (!shopId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const staff = await prisma.staff.create({
      data: { shopId, name, email, phone, role, bio },
    });
    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    console.error("Error creating staff:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
