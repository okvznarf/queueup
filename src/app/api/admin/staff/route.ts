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
    const staff = await prisma.staff.findMany({ where: { shopId }, orderBy: { sortOrder: "asc" } });
    return NextResponse.json(staff);
  } catch { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopId, name, role, email, phone, bio } = body;
    if (!shopId || !name) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    const auth = await requireAdmin(request, shopId);
    if (auth.error) return auth.error;
    const staff = await prisma.staff.create({
      data: { shopId, name: sanitize(name, 100), role: sanitize(role || "", 100), email, phone, bio: sanitize(bio || "", 500) },
    });
    return NextResponse.json(staff, { status: 201 });
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, role, email, phone, bio, isActive } = body;
    const staff = await prisma.staff.findUnique({ where: { id }, select: { shopId: true } });
    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const auth = await requireAdmin(request, staff.shopId);
    if (auth.error) return auth.error;
    const updated = await prisma.staff.update({
      where: { id },
      data: { name: name ? sanitize(name, 100) : undefined, role, email, phone, bio, isActive },
    });
    return NextResponse.json(updated);
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    const staff = await prisma.staff.findUnique({ where: { id }, select: { shopId: true } });
    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const auth = await requireAdmin(request, staff.shopId);
    if (auth.error) return auth.error;
    await prisma.staff.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
