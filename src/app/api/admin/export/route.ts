import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/security";

// GET /api/admin/export?shopId=X&type=appointments&from=2026-01-01&to=2026-03-31
// Streams CSV — browser downloads it progressively, never holds full dataset in memory.
// For truly massive datasets (100K+ rows), swap the DB query for a cursor-based
// iteration and pipe through S3 (see architecture notes below).

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit("admin-export:" + ip, 5, 300000)) {
    return new Response("Too many export requests. Try again in 5 minutes.", { status: 429 });
  }

  const shopId = request.nextUrl.searchParams.get("shopId");
  if (!shopId) return new Response("shopId required", { status: 400 });

  const admin = await requireAdmin(request, shopId);
  if (admin.error) return admin.error;

  const type = request.nextUrl.searchParams.get("type") || "appointments";
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const push = (line: string) => controller.enqueue(encoder.encode(line + "\n"));

      try {
        if (type === "appointments") {
          push("Date,Time,Customer,Phone,Email,Service,Staff,Status,Price");

          // Stream in batches of 200 to limit memory
          let cursor: string | undefined;
          const batchSize = 200;
          let hasMore = true;

          while (hasMore) {
            const where: Record<string, unknown> = { shopId };
            if (from || to) {
              where.date = {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              };
            }

            const batch = await prisma.appointment.findMany({
              where,
              select: {
                id: true, date: true, startTime: true, status: true, totalPrice: true,
                customer: { select: { name: true, phone: true, email: true } },
                service: { select: { name: true } },
                staff: { select: { name: true } },
              },
              orderBy: { date: "asc" },
              take: batchSize + 1,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            });

            hasMore = batch.length > batchSize;
            const rows = hasMore ? batch.slice(0, batchSize) : batch;

            for (const a of rows) {
              const date = new Date(a.date).toISOString().split("T")[0];
              push([
                date, a.startTime, csvEscape(a.customer.name), a.customer.phone ?? "",
                a.customer.email ?? "", csvEscape(a.service.name), csvEscape(a.staff?.name ?? ""),
                a.status, (a.totalPrice ?? 0).toFixed(2),
              ].join(","));
            }

            if (rows.length > 0) cursor = rows[rows.length - 1].id;
            else hasMore = false;
          }
        } else if (type === "customers") {
          push("Name,Phone,Email,Total Appointments");

          const customers = await prisma.customer.findMany({
            where: { shopId },
            select: {
              name: true, phone: true, email: true,
              _count: { select: { appointments: true } },
            },
            orderBy: { name: "asc" },
            take: 10000,
          });

          for (const c of customers) {
            push([csvEscape(c.name), c.phone ?? "", c.email ?? "", c._count.appointments].join(","));
          }
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  const filename = `${type}-export-${new Date().toISOString().split("T")[0]}.csv`;

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache",
    },
  });
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
