import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitize, isValidEmail, isValidPhone, rateLimit, getClientIp, parseBody } from "@/lib/security";
import { requireAdmin } from "@/lib/auth";
import { cacheDelete } from "@/lib/cache";

export async function PATCH(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("admin-shop:" + ip, 20, 60000)) {
    return NextResponse.json({ error: "Too many requests. Try again later." }, { status: 429 });
  }
  try {
    const body = await parseBody(request, 10_000);
    if (!body) return NextResponse.json({ error: "Invalid or oversized payload" }, { status: 400 });
    const { id, name, description, phone, email, address, city, state, zipCode, primaryColor, darkMode } = body;
    if (!id || typeof id !== "string") return NextResponse.json({ error: "id required" }, { status: 400 });
    if (email && !isValidEmail(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    if (phone && !isValidPhone(phone)) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    if (primaryColor && !/^#[0-9a-fA-F]{6}$/.test(primaryColor)) return NextResponse.json({ error: "Invalid color format" }, { status: 400 });
    const auth = await requireAdmin(request, id);
    if (auth.error) return auth.error;
    const shop = await prisma.shop.update({
      where: { id },
      data: {
        name: name ? sanitize(name, 100) : undefined,
        description: description !== undefined ? sanitize(description, 500) : undefined,
        phone: phone !== undefined ? sanitize(phone, 30) : undefined,
        email: email !== undefined ? sanitize(email, 200).toLowerCase() : undefined,
        address: address !== undefined ? sanitize(address, 200) : undefined,
        city: city !== undefined ? sanitize(city, 100) : undefined,
        state: state !== undefined ? sanitize(state, 100) : undefined,
        zipCode: zipCode !== undefined ? sanitize(zipCode, 20) : undefined,
        primaryColor: primaryColor || undefined,
        darkMode: typeof darkMode === "boolean" ? darkMode : undefined,
      },
    });
    cacheDelete("shop:");
    return NextResponse.json(shop);
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
