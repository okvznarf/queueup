import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const p = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const [shops, users, appts, services, staff] = await Promise.all([
    p.shop.count(),
    p.user.count(),
    p.appointment.count(),
    p.service.count(),
    p.staff.count(),
  ]);
  console.log("Row counts:", { shops, users, appts, services, staff });

  const sampleShops = await p.shop.findMany({
    select: { name: true, slug: true, businessType: true, createdAt: true },
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  console.log("\nRecent shops:");
  console.table(sampleShops);

  const tables = await p.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`,
  );
  console.log("\nTables in public schema:", tables.map((t) => t.table_name));

  const hasPrismaMigrations = tables.some((t) => t.table_name === "_prisma_migrations");
  if (hasPrismaMigrations) {
    const migs = await p.$queryRawUnsafe<Array<{ migration_name: string; finished_at: Date | null }>>(
      `SELECT migration_name, finished_at FROM "_prisma_migrations" ORDER BY started_at;`,
    );
    console.log("\n_prisma_migrations rows:", migs);
  } else {
    console.log("\n_prisma_migrations table does NOT exist.");
  }

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
