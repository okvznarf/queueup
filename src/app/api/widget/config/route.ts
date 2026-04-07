import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
  const shopId = request.nextUrl.searchParams.get("shopId");

  if (!shopId) {
    return NextResponse.json(
      { error: "shopId required" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Try by ID first, then by slug
  let shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { name: true, primaryColor: true, slug: true },
  });

  if (!shop) {
    shop = await prisma.shop.findFirst({
      where: { slug: shopId },
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
}
