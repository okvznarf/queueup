import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const shopId = request.nextUrl.searchParams.get("shopId");
  if (!shopId) {
    return NextResponse.json({ error: "shopId is required" }, { status: 400 });
  }
  try {
    const services = await prisma.service.findMany({
      where: { shopId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(services);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, name, description, duration, price, icon, category } = body;
    if (!shopId || !name || !duration || price === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    const service = await prisma.service.create({
      data: { shopId, name, description, duration, price, icon, category },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("Error creating service:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
