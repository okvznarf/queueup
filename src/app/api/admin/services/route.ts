import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitize, isPositiveNumber } from "@/lib/security";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const shopId = request.nextUrl.searchParams.get("shopId");
  if (!shopId) return NextResponse.json({ error: "shopId required" }, { status: 400 });
  const auth = await requireAdmin(request, shopId);
  if (auth.error) return auth.error;
  try {
    const services = await prisma.service.findMany({ where: { shopId }, orderBy: { sortOrder: "asc" } });
    return NextResponse.json(services);
  } catch { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, name, duration, price, icon, description, category } = body;
    if (!shopId || !name || !duration) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (!isPositiveNumber(duration) || duration < 1 || duration > 480) return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    if (price !== undefined && !isPositiveNumber(price)) return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    const auth = await requireAdmin(request, shopId);
    if (auth.error) return auth.error;
    const service = await prisma.service.create({
      data: {
        shopId,
        name: sanitize(name, 100),
        duration: Math.round(duration),
        price: price || 0,
        icon: icon ? sanitize(icon, 50) : undefined,
        description: sanitize(description || "", 500),
        category: category ? sanitize(category, 100) : undefined,
      },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, duration, price, icon, description, isActive } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (duration !== undefined && (!isPositiveNumber(duration) || duration < 1 || duration > 480)) return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    if (price !== undefined && !isPositiveNumber(price)) return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    const service = await prisma.service.findUnique({ where: { id }, select: { shopId: true } });
    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const auth = await requireAdmin(request, service.shopId);
    if (auth.error) return auth.error;
    const updated = await prisma.service.update({
      where: { id },
      data: {
        name: name ? sanitize(name, 100) : undefined,
        duration: duration !== undefined ? Math.round(duration) : undefined,
        price,
        icon: icon !== undefined ? sanitize(icon, 50) : undefined,
        description: description !== undefined ? sanitize(description, 500) : undefined,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const service = await prisma.service.findUnique({ where: { id }, select: { shopId: true } });
    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const auth = await requireAdmin(request, service.shopId);
    if (auth.error) return auth.error;
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
