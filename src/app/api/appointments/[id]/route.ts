import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await request.json();
    const { status } = body;
    const appointment = await prisma.appointment.update({
      where: { id },
      data: { status },
      include: { service: true, staff: true, customer: true },
    });
    return NextResponse.json(appointment);
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}