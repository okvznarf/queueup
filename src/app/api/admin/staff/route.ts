import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sanitize, isValidEmail, isValidPhone } from "@/lib/security";
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
    if (email && !isValidEmail(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    if (phone && !isValidPhone(phone)) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    const auth = await requireAdmin(request, shopId);
    if (auth.error) return auth.error;
    const staff = await prisma.staff.create({
      data: {
        shopId,
        name: sanitize(name, 100),
        role: sanitize(role || "", 100),
        email: email ? sanitize(email, 200).toLowerCase() : null,
        phone: phone ? sanitize(phone, 30) : null,
        bio: sanitize(bio || "", 500),
      },
    });
    return NextResponse.json(staff, { status: 201 });
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, role, email, phone, bio, isActive } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (email && !isValidEmail(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    if (phone && !isValidPhone(phone)) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
    const staff = await prisma.staff.findUnique({ where: { id }, select: { shopId: true } });
    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const auth = await requireAdmin(request, staff.shopId);
    if (auth.error) return auth.error;
    const updated = await prisma.staff.update({
      where: { id },
      data: {
        name: name ? sanitize(name, 100) : undefined,
        role: role !== undefined ? sanitize(role, 100) : undefined,
        email: email !== undefined ? (email ? sanitize(email, 200).toLowerCase() : null) : undefined,
        phone: phone !== undefined ? (phone ? sanitize(phone, 30) : null) : undefined,
        bio: bio !== undefined ? sanitize(bio, 500) : undefined,
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
    const staff = await prisma.staff.findUnique({ where: { id }, select: { shopId: true } });
    if (!staff) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const auth = await requireAdmin(request, staff.shopId);
    if (auth.error) return auth.error;
    await prisma.staff.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}
