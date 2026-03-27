import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyToken, hashPassword } from "@/lib/auth";
import { rateLimit, sanitize, isValidEmail, isValidPhone, getClientIp } from "@/lib/security";

function requireSuperadmin(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") || "";
  const tokenMatch = cookieHeader.match(/auth_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : null;
  if (!token) return null;
  const user = verifyToken(token);
  if (!user || user.role !== "superadmin") return null;
  return user;
}

// GET all shops with subscription info
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("superadmin-get:" + ip, 30, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = requireSuperadmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Offset pagination: ?page=1&limit=50
  const page = Math.max(Number(request.nextUrl.searchParams.get("page")) || 1, 1);
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit")) || 50, 100);
  const skip = (page - 1) * limit;

  const [shops, total] = await Promise.all([
    prisma.shop.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        businessType: true,
        subscriptionActive: true,
        trialEndsAt: true,
        employeeCount: true,
        paidUntil: true,
        monthlyPrice: true,
        createdAt: true,
        _count: { select: { appointments: true, customers: true, staff: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.shop.count(),
  ]);

  return NextResponse.json({
    data: shops,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// PATCH - update subscription for a shop
export async function PATCH(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("superadmin-patch:" + ip, 20, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = requireSuperadmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { shopId, employeeCount, subscriptionActive, paidUntil } = body;

  if (!shopId) return NextResponse.json({ error: "shopId required" }, { status: 400 });

  const data: any = {};
  if (typeof subscriptionActive === "boolean") data.subscriptionActive = subscriptionActive;
  if (typeof employeeCount === "number" && employeeCount >= 0) {
    data.employeeCount = employeeCount;
    data.monthlyPrice = 25 + employeeCount * 5;
  }
  if (paidUntil) data.paidUntil = new Date(paidUntil);

  const shop = await prisma.shop.update({ where: { id: shopId }, data });

  return NextResponse.json(shop);
}

// POST - create a new shop with admin user
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("superadmin-post:" + ip, 10, 60000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const user = requireSuperadmin(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name: rawName, email: rawEmail, password, businessType, phone: rawPhone, employeeCount: empCount } = body;

  if (!rawName || !rawEmail || !password || !businessType) {
    return NextResponse.json({ error: "Name, email, password, and business type are required" }, { status: 400 });
  }

  const name = sanitize(rawName, 100);
  const email = sanitize(rawEmail, 200).toLowerCase();
  const phone = rawPhone ? sanitize(rawPhone, 30) : null;

  if (!isValidEmail(email)) return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  if (phone && !isValidPhone(phone)) return NextResponse.json({ error: "Invalid phone" }, { status: 400 });
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    return NextResponse.json({ error: "Password must be 8-128 characters" }, { status: 400 });
  }

  const allowedTypes = ["barber", "salon", "restaurant", "mechanic", "clinic", "spa", "other"];
  if (!allowedTypes.includes(businessType)) {
    return NextResponse.json({ error: "Invalid business type" }, { status: 400 });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const existingSlug = await prisma.shop.findUnique({ where: { slug }, select: { id: true } });
  if (existingSlug) return NextResponse.json({ error: "A shop with this name already exists" }, { status: 409 });

  const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingUser) return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const employees = empCount || 1;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

  const adminUser = await prisma.user.create({
    data: { email, name, passwordHash, role: "owner" },
  });

  const shop = await prisma.shop.create({
    data: {
      name,
      slug,
      businessType,
      email,
      phone: phone || null,
      ownerId: adminUser.id,
      employeeCount: employees,
      monthlyPrice: 25 + employees * 5,
      trialEndsAt,
      subscriptionActive: true,
    },
  });

  return NextResponse.json({ shop, adminUser: { id: adminUser.id, email: adminUser.email } }, { status: 201 });
}
