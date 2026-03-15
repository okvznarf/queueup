import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const shops = [
    { slug: "sharp-and-co", email: "admin@sharpandco.com", name: "Sharp & Co Admin" },
    { slug: "ember-and-oak", email: "admin@emberandoak.com", name: "Ember & Oak Admin" },
    { slug: "iron-works-auto", email: "admin@ironworksauto.com", name: "Iron Works Admin" },
  ];

  for (const s of shops) {
    const shop = await prisma.shop.findUnique({ where: { slug: s.slug } });
    if (!shop) { console.log("Shop not found: " + s.slug); continue; }

    const existing = await prisma.user.findUnique({ where: { email: s.email } });
    if (existing) { console.log("Already exists: " + s.email); continue; }

    await prisma.user.create({
      data: { name: s.name, email: s.email, passwordHash, role: "admin", ownedShops: { connect: { id: shop.id } } },
    });
    console.log("Created admin: " + s.email);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
