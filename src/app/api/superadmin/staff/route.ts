import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { rateLimit, sanitize, isValidEmail, isValidPhone } from "@/lib/security";

function requireSuperadmin(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";
  const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  if (!token) return null;
  const user = verifyToken(token);
  if (!user || user.role !== "superadmin") return null;
  return user;
}

// GET staff for a shop
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("superadmin-staff-get:" + ip, 30, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = requireSuperadmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const shopId = request.nextUrl.searchParams.get("shopId");
  if (!shopId) return NextResponse.json({ error: "shopId required" }, { status: 400 });

  const staff = await prisma.staff.findMany({
    where: { shopId },
    select: { id: true, name: true, role: true, email: true, phone: true, bio: true, avatarUrl: true, isActive: true, sortOrder: true },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(staff);
}

// POST - create staff for a shop
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("superadmin-staff-post:" + ip, 20, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = requireSuperadmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { shopId, name, role, email, phone, bio, avatarUrl } = body;

  if (!shopId || !name) return NextResponse.json({ error: "shopId and name required" }, { status: 400 });
  if (email && !isValidEmail(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (phone && !isValidPhone(phone)) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });

  // Validate avatar if provided (must be data URL or https URL, max 500KB base64)
  if (avatarUrl && typeof avatarUrl === "string") {
    if (!avatarUrl.startsWith("data:image/") && !avatarUrl.startsWith("https://")) {
      return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
    }
    if (avatarUrl.length > 700_000) {
      return NextResponse.json({ error: "Avatar too large (max 500KB)" }, { status: 400 });
    }
  }

  const staff = await prisma.staff.create({
    data: {
      shopId,
      name: sanitize(name, 100),
      role: sanitize(role || "", 100),
      email: email ? sanitize(email, 200).toLowerCase() : null,
      phone: phone ? sanitize(phone, 30) : null,
      bio: sanitize(bio || "", 500),
      avatarUrl: avatarUrl || null,
    },
  });

  return NextResponse.json(staff, { status: 201 });
}

// PATCH - update staff (including avatar)
export async function PATCH(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("superadmin-staff-patch:" + ip, 20, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = requireSuperadmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { id, name, role, email, phone, bio, avatarUrl, isActive } = body;

  if (!id) return NextResponse.json({ error: "Staff id required" }, { status: 400 });
  if (email && !isValidEmail(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (phone && !isValidPhone(phone)) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });

  const existing = await prisma.staff.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  if (avatarUrl && typeof avatarUrl === "string") {
    if (!avatarUrl.startsWith("data:image/") && !avatarUrl.startsWith("https://")) {
      return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 });
    }
    if (avatarUrl.length > 700_000) {
      return NextResponse.json({ error: "Avatar too large (max 500KB)" }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = sanitize(name, 100);
  if (role !== undefined) data.role = sanitize(role, 100);
  if (email !== undefined) data.email = email ? sanitize(email, 200).toLowerCase() : null;
  if (phone !== undefined) data.phone = phone ? sanitize(phone, 30) : null;
  if (bio !== undefined) data.bio = sanitize(bio, 500);
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl || null;
  if (typeof isActive === "boolean") data.isActive = isActive;

  const updated = await prisma.staff.update({ where: { id }, data });

  return NextResponse.json(updated);
}

// DELETE staff
export async function DELETE(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!rateLimit("superadmin-staff-delete:" + ip, 10, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = requireSuperadmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Staff id required" }, { status: 400 });

  await prisma.staff.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
