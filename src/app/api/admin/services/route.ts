import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitize } from "@/lib/security";
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
    const auth = await requireAdmin(request, shopId);
    if (auth.error) return auth.error;
    const service = await prisma.service.create({
      data: { shopId, name: sanitize(name, 100), duration, price: price || 0, icon, description: sanitize(description || "", 500), category },
    });
    return NextResponse.json(service, { status: 201 });
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, duration, price, icon, description, isActive } = body;
    const service = await prisma.service.findUnique({ where: { id }, select: { shopId: true } });
    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const auth = await requireAdmin(request, service.shopId);
    if (auth.error) return auth.error;
    const updated = await prisma.service.update({
      where: { id },
      data: { name: name ? sanitize(name, 100) : undefined, duration, price, icon, description: description ? sanitize(description, 500) : undefined, isActive },
    });
    return NextResponse.json(updated);
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const service = await prisma.service.findUnique({ where: { id }, select: { shopId: true } });
    if (!service) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const auth = await requireAdmin(request, service.shopId);
    if (auth.error) return auth.error;
    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
