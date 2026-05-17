import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimit, getClientIp } from "@/lib/security";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET",
};

/**
 * GET /api/widget/config?shopId=X
 *
 * Public endpoint returning shop branding for the embeddable chat widget.
 * No auth required — returns only public display data.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("widget-config:" + ip, 60, 60000)) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: CORS_HEADERS },
    );
  }
  const shopId = request.nextUrl.searchParams.get("shopId");

  if (!shopId) {
    return NextResponse.json(
      { error: "shopId required" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    // Try by slug first (most common for widget), then by ID
    let shop = await prisma.shop.findFirst({
      where: { slug: shopId },
      select: { name: true, primaryColor: true, slug: true },
    });

    if (!shop) {
      shop = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { name: true, primaryColor: true, slug: true },
      });
    }

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(
      {
        shopName: shop.name,
        primaryColor: shop.primaryColor ?? "#6366f1",
        slug: shop.slug,
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    console.error("[widget/config] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
