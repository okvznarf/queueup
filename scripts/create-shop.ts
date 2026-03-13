import "dotenv/config";
import * as readline from "readline";
import * as bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q: string): Promise<string> => new Promise((res) => rl.question(q, res));

const BUSINESS_TYPES = ["BARBER", "SALON", "RESTAURANT", "MECHANIC", "DENTIST", "SPA", "FITNESS", "VETERINARY", "OTHER"];

const LABELS: Record<string, { staff: string; service: string; booking: string }> = {
  BARBER:     { staff: "Barber",     service: "Service",     booking: "Appointment" },
  SALON:      { staff: "Stylist",    service: "Treatment",   booking: "Appointment" },
  RESTAURANT: { staff: "Server",     service: "Experience",  booking: "Reservation" },
  MECHANIC:   { staff: "Technician", service: "Repair Type", booking: "Service Appointment" },
  DENTIST:    { staff: "Doctor",     service: "Treatment",   booking: "Appointment" },
  SPA:        { staff: "Therapist",  service: "Treatment",   booking: "Appointment" },
  FITNESS:    { staff: "Trainer",    service: "Session",     booking: "Booking" },
  VETERINARY: { staff: "Vet",        service: "Service",     booking: "Appointment" },
  OTHER:      { staff: "Staff",      service: "Service",     booking: "Appointment" },
};

async function main() {
  console.log("\n=== QueueUp — Create New Shop ===\n");

  const shopName  = await ask("Shop name: ");
  const ownerName = await ask("Owner name: ");
  const email     = await ask("Owner email (for admin login): ");
  const password  = await ask("Owner password: ");

  console.log("\nBusiness types:");
  BUSINESS_TYPES.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
  const typeIndex = parseInt(await ask("Choose type (1-9): "), 10) - 1;
  const businessType = BUSINESS_TYPES[typeIndex] ?? "OTHER";

  const phone   = await ask("Phone (optional, press Enter to skip): ");
  const address = await ask("Address (optional, press Enter to skip): ");
  const city    = await ask("City (optional, press Enter to skip): ");

  rl.close();

  const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const l = LABELS[businessType];

  console.log("\nCreating shop and admin account...");

  try {
    // Check slug availability
    const existingShop = await prisma.shop.findUnique({ where: { slug } });
    if (existingShop) {
      console.error(`\nError: A shop with slug "${slug}" already exists. Choose a different shop name.`);
      process.exit(1);
    }

    // Check email availability
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      console.error(`\nError: An admin account with email "${email}" already exists.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name: ownerName, email, passwordHash, role: "owner" },
    });

    const shop = await prisma.shop.create({
      data: {
        name: shopName,
        slug,
        businessType: businessType as any,
        phone: phone || null,
        address: address || null,
        city: city || null,
        staffLabel: l.staff,
        serviceLabel: l.service,
        bookingLabel: l.booking,
        showStaffPicker: businessType !== "RESTAURANT",
        showPartySize: businessType === "RESTAURANT",
        showVehicleInfo: businessType === "MECHANIC",
        ownerId: user.id,
        workingHours: {
          create: [
            { day: "MONDAY",    openTime: "09:00", closeTime: "18:00" },
            { day: "TUESDAY",   openTime: "09:00", closeTime: "18:00" },
            { day: "WEDNESDAY", openTime: "09:00", closeTime: "18:00" },
            { day: "THURSDAY",  openTime: "09:00", closeTime: "18:00" },
            { day: "FRIDAY",    openTime: "09:00", closeTime: "18:00" },
            { day: "SATURDAY",  openTime: "09:00", closeTime: "14:00" },
            { day: "SUNDAY",    openTime: "09:00", closeTime: "14:00", isClosed: true },
          ],
        },
      },
    });

    console.log("\n✓ Shop created successfully!\n");
    console.log(`  Shop name:   ${shop.name}`);
    console.log(`  Slug:        ${shop.slug}`);
    console.log(`  Type:        ${shop.businessType}`);
    console.log(`  Admin login: ${email}`);
    console.log(`\n  Dashboard URL: http://localhost:3000/admin/${shop.slug}/appointments`);
    console.log(`  Admin login:   http://localhost:3000/admin/login`);
    console.log(`  Booking page:  http://localhost:3000/booking/${shop.slug}\n`);
  } catch (err: any) {
    console.error("\nFailed:", err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
