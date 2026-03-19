import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("demo1234", 12);

  // Create owner
  let owner = await prisma.user.findUnique({ where: { email: "demo@queueup.me" } });
  if (!owner) {
    owner = await prisma.user.create({
      data: { name: "Demo Owner", email: "demo@queueup.me", passwordHash, role: "owner" },
    });
    console.log("Created owner: demo@queueup.me / demo1234");
  } else {
    console.log("Owner already exists");
  }

  // Create shop
  let shop = await prisma.shop.findUnique({ where: { slug: "demo-barber" } });
  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        name: "Demo Barber",
        slug: "demo-barber",
        businessType: "BARBER",
        email: "demo@queueup.me",
        phone: "+385 91 000 0000",
        address: "Demo Street 1, Zagreb",
        primaryColor: "#84934A",
        ownerId: owner.id,
      },
    });
    console.log("Created shop: demo-barber");
  } else {
    console.log("Shop already exists");
  }

  // Working hours
  const days = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"] as const;
  for (const day of days) {
    const existing = await prisma.workingHours.findUnique({ where: { shopId_day: { shopId: shop.id, day } } });
    if (!existing) {
      await prisma.workingHours.create({
        data: {
          shopId: shop.id,
          day,
          openTime: "09:00",
          closeTime: "18:00",
          isClosed: day === "SUNDAY",
        },
      });
    }
  }
  console.log("Working hours set");

  // Staff
  let staff = await prisma.staff.findFirst({ where: { shopId: shop.id, name: "John Demo" } });
  if (!staff) {
    staff = await prisma.staff.create({
      data: { shopId: shop.id, name: "John Demo", email: "john@demo.com", role: "Barber", isActive: true },
    });
    console.log("Created staff: John Demo");
  }

  // Services
  const services = [
    { name: "Haircut", duration: 30, price: 15 },
    { name: "Haircut + Beard", duration: 45, price: 22 },
    { name: "Beard Trim", duration: 20, price: 10 },
  ];
  for (const s of services) {
    const existing = await prisma.service.findFirst({ where: { shopId: shop.id, name: s.name } });
    if (!existing) {
      await prisma.service.create({ data: { ...s, shopId: shop.id, isActive: true } });
      console.log("Created service: " + s.name);
    }
  }

  // Demo customer
  let customer = await prisma.customer.findFirst({ where: { shopId: shop.id, email: "testcustomer@gmail.com" } });
  if (!customer) {
    const custHash = await bcrypt.hash("test1234", 12);
    customer = await prisma.customer.create({
      data: {
        shopId: shop.id,
        name: "Test Customer",
        email: "testcustomer@gmail.com",
        phone: "+385 91 111 1111",
        passwordHash: custHash,
      },
    });
    console.log("Created customer: testcustomer@gmail.com / test1234");
  }

  console.log("\nDone! Visit: https://queueup.me/booking/demo-barber");
  console.log("Admin login: https://queueup.me/admin/login");
  console.log("  Email: demo@queueup.me | Password: demo1234");
  console.log("Customer login: https://queueup.me/customer/login?shop=demo-barber");
  console.log("  Email: testcustomer@gmail.com | Password: test1234");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
