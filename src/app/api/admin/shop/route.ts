import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitize } from "@/lib/security";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, phone, email, address, city, state, zipCode, primaryColor, darkMode } = body;
    const shop = await prisma.shop.update({
      where: { id },
      data: {
        name: name ? sanitize(name, 100) : undefined,
        description: description ? sanitize(description, 500) : undefined,
        phone, email, address, city, state, zipCode, primaryColor, darkMode,
      },
    });
    return NextResponse.json(shop);
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}