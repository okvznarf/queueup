import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const shop = await prisma.shop.findUnique({ where: { slug: "demo-barber" } });
  if (!shop) { console.log("Shop not found"); return; }

  const appts = await prisma.appointment.deleteMany({ where: { shopId: shop.id } });
  console.log(`Deleted ${appts.count} appointments`);

  const customers = await prisma.customer.deleteMany({ where: { shopId: shop.id } });
  console.log(`Deleted ${customers.count} customers`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
