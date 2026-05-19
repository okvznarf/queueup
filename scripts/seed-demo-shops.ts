/**
 * Idempotent seed script — creates three demo shops (one per v3 pack) so the
 * booking page and admin dashboard have realistic content for sales calls,
 * screenshots, and self-testing.
 *
 * Slugs:
 *   /booking/demo-mechanic  (MECHANIC pack — drop-off flow, repair-status data)
 *   /booking/demo-barber    (BARBER pack — fixed-slot flow)
 *   /booking/demo-dentist   (DENTIST pack — fixed-slot flow, GDPR-aware)
 *
 * Owner credentials (all three):
 *   email:    demo+{mechanic|barber|dentist}@queueup.me
 *   password: demo-shop-2026
 *
 * Re-runnable: existing shops are skipped, existing services/staff/hours/
 * appointments are not touched. To start fresh, manually delete the rows
 * and re-run.
 *
 * Usage: npm run seed-demo
 */
import "dotenv/config";
import * as bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { mechanicPack } from "../src/lib/verticals/mechanic";
import { barberPack } from "../src/lib/verticals/barber";
import { dentistPack } from "../src/lib/verticals/dentist";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "demo-shop-2026";

const STANDARD_HOURS = [
  { day: "MONDAY",    openTime: "08:00", closeTime: "17:00", isClosed: false },
  { day: "TUESDAY",   openTime: "08:00", closeTime: "17:00", isClosed: false },
  { day: "WEDNESDAY", openTime: "08:00", closeTime: "17:00", isClosed: false },
  { day: "THURSDAY",  openTime: "08:00", closeTime: "17:00", isClosed: false },
  { day: "FRIDAY",    openTime: "08:00", closeTime: "17:00", isClosed: false },
  { day: "SATURDAY",  openTime: "09:00", closeTime: "13:00", isClosed: false },
  { day: "SUNDAY",    openTime: "00:00", closeTime: "00:00", isClosed: true },
];

type DemoSpec = {
  slug: string;
  name: string;
  pack: typeof mechanicPack | typeof barberPack | typeof dentistPack;
  ownerEmail: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  primaryColor: string;
  staff: Array<{ name: string; role: string }>;
};

const DEMOS: DemoSpec[] = [
  {
    slug: "demo-mechanic",
    name: "Demo Autoservis",
    pack: mechanicPack,
    ownerEmail: "demo+mechanic@queueup.me",
    ownerName: "Demo Mehanic Owner",
    phone: "+385 91 234 5678",
    address: "Vukovarska 42",
    city: "Zagreb",
    primaryColor: "#C8A45A",
    staff: [
      { name: "Marko Horvat", role: "Mehaničar" },
      { name: "Ivan Novak", role: "Mehaničar" },
    ],
  },
  {
    slug: "demo-barber",
    name: "Demo Frizerski Salon",
    pack: barberPack,
    ownerEmail: "demo+barber@queueup.me",
    ownerName: "Demo Barber Owner",
    phone: "+385 91 234 5679",
    address: "Ilica 88",
    city: "Zagreb",
    primaryColor: "#84934A",
    staff: [
      { name: "Petar Babić", role: "Frizer" },
      { name: "Luka Tomić", role: "Frizer" },
      { name: "Ana Kralj", role: "Frizerka" },
    ],
  },
  {
    slug: "demo-dentist",
    name: "Demo Stomatološka Ordinacija",
    pack: dentistPack,
    ownerEmail: "demo+dentist@queueup.me",
    ownerName: "Demo Dentist Owner",
    phone: "+385 91 234 5680",
    address: "Maksimirska 12",
    city: "Zagreb",
    primaryColor: "#4F7CAC",
    staff: [
      { name: "Dr. Maja Perić", role: "Doktorica" },
      { name: "Dr. Tomislav Bilić", role: "Doktor" },
    ],
  },
];

async function seedDemo(spec: DemoSpec): Promise<void> {
  const existing = await prisma.shop.findUnique({ where: { slug: spec.slug } });
  if (existing) {
    console.log(`  → ${spec.slug}: already exists — skipping (delete the row to re-seed).`);
    return;
  }

  let owner = await prisma.user.findUnique({ where: { email: spec.ownerEmail } });
  if (!owner) {
    owner = await prisma.user.create({
      data: {
        name: spec.ownerName,
        email: spec.ownerEmail,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
        role: "owner",
      },
    });
  }

  const pack = spec.pack;
  const isMechanic = pack.slug === "MECHANIC";
  const isDentist = pack.slug === "DENTIST";

  const shop = await prisma.shop.create({
    data: {
      name: spec.name,
      slug: spec.slug,
      businessType: pack.slug as any,
      phone: spec.phone,
      address: spec.address,
      city: spec.city,
      country: "HR",
      timezone: "Europe/Zagreb",
      currency: "EUR",
      primaryColor: spec.primaryColor,
      staffLabel: pack.labels.staffLabel,
      serviceLabel: pack.labels.serviceLabel,
      bookingLabel: pack.labels.bookingLabel,
      showStaffPicker: !isMechanic, // mechanic drop-off doesn't pick a tech
      showVehicleInfo: isMechanic,
      employeeCount: spec.staff.length,
      monthlyPrice: pack.pricing.base + pack.pricing.perUnit * spec.staff.length,
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subscriptionActive: true,
      ownerId: owner.id,
      workingHours: { create: STANDARD_HOURS as any },
      services: {
        create: pack.defaultServices.map((s, i) => ({
          name: s.name,
          description: s.description ?? null,
          duration: s.duration,
          price: s.price,
          category: s.category ?? null,
          sortOrder: i,
        })),
      },
      staff: {
        create: spec.staff.map((s, i) => ({
          name: s.name,
          role: s.role,
          sortOrder: i,
        })),
      },
    },
    include: { services: true, staff: true },
  });

  // Seed a few realistic appointments so the dashboard looks alive.
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appts = isMechanic
    ? mechanicAppointments(shop, today)
    : isDentist
    ? dentistAppointments(shop, today)
    : barberAppointments(shop, today);

  for (const a of appts) {
    const customer = await prisma.customer.upsert({
      where: { phone_shopId: { phone: a.phone, shopId: shop.id } },
      create: { name: a.customerName, phone: a.phone, email: a.email ?? null, shopId: shop.id },
      update: {},
    });
    await prisma.appointment.create({
      data: {
        shopId: shop.id,
        serviceId: a.serviceId,
        staffId: a.staffId,
        customerId: customer.id,
        date: a.date,
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status as any,
        notes: a.notes ?? null,
        vehicleInfo: a.vehicleInfo ?? null,
        licensePlate: a.licensePlate ?? null,
        repairStatus: a.repairStatus as any,
        repairStatusNote: a.repairStatusNote ?? null,
        repairStatusUpdatedAt: a.repairStatus ? new Date() : null,
        totalPrice: a.totalPrice ?? null,
      },
    });
  }

  console.log(`  ✓ ${spec.slug}: ${shop.services.length} services, ${shop.staff.length} staff, ${appts.length} appts`);
}

type DemoAppointment = {
  customerName: string;
  phone: string;
  email: string | null;
  serviceId: string;
  staffId: string | null;
  date: Date;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string | null;
  vehicleInfo?: string | null;
  licensePlate?: string | null;
  repairStatus?: string | null;
  repairStatusNote?: string | null;
  totalPrice?: number | null;
};

function mechanicAppointments(shop: any, today: Date): DemoAppointment[] {
  const oilChange = shop.services.find((s: any) => s.name.includes("ulja"));
  const brakes = shop.services.find((s: any) => s.name.includes("Disk"));
  const diag = shop.services.find((s: any) => s.name.includes("Dijagnostika"));
  return [
    {
      customerName: "Ana Kovačević", phone: "+385 91 111 1111", email: "ana@example.com",
      serviceId: oilChange?.id ?? shop.services[0].id, staffId: null,
      date: today, startTime: "08:00", endTime: "17:00",
      status: "CONFIRMED",
      vehicleInfo: "2018 VW Golf", licensePlate: "ZG-1234-AB",
      repairStatus: "IN_PROGRESS", repairStatusNote: "Oil change started, looking at brake pads next.",
      totalPrice: oilChange?.price ?? 70,
    },
    {
      customerName: "Marko Babić", phone: "+385 91 222 2222", email: null,
      serviceId: brakes?.id ?? shop.services[0].id, staffId: null,
      date: today, startTime: "08:00", endTime: "17:00",
      status: "CONFIRMED",
      vehicleInfo: "2020 Škoda Octavia", licensePlate: "RI-5678-CD",
      repairStatus: "WAITING_FOR_PARTS", repairStatusNote: "Brake pads on order — expected Tuesday afternoon.",
      totalPrice: brakes?.price ?? 90,
    },
    {
      customerName: "Petra Horvat", phone: "+385 91 333 3333", email: "petra@example.com",
      serviceId: diag?.id ?? shop.services[0].id, staffId: null,
      date: today, startTime: "08:00", endTime: "17:00",
      status: "COMPLETED",
      vehicleInfo: "2016 Opel Astra", licensePlate: "ZG-9012-EF",
      repairStatus: "READY", repairStatusNote: "Diagnostika gotova — sve OK. Spreman za podizanje.",
      totalPrice: diag?.price ?? 40,
    },
  ];
}

function barberAppointments(shop: any, today: Date): DemoAppointment[] {
  const haircut = shop.services.find((s: any) => s.name.toLowerCase().includes("šišanje"));
  const beard = shop.services.find((s: any) => s.name.toLowerCase().includes("brada"));
  const staffA = shop.staff[0];
  const staffB = shop.staff[1] ?? staffA;
  return [
    {
      customerName: "Filip Lovrić", phone: "+385 92 111 1111", email: "filip@example.com",
      serviceId: haircut?.id ?? shop.services[0].id, staffId: staffA?.id ?? null,
      date: today, startTime: "09:30", endTime: "10:00",
      status: "CONFIRMED",
      totalPrice: haircut?.price ?? 15,
    },
    {
      customerName: "Domagoj Vuković", phone: "+385 92 222 2222", email: null,
      serviceId: beard?.id ?? shop.services[1].id, staffId: staffA?.id ?? null,
      date: today, startTime: "11:00", endTime: "11:20",
      status: "CONFIRMED",
      totalPrice: beard?.price ?? 12,
    },
    {
      customerName: "Karlo Šimić", phone: "+385 92 333 3333", email: "karlo@example.com",
      serviceId: haircut?.id ?? shop.services[0].id, staffId: staffB?.id ?? null,
      date: today, startTime: "14:30", endTime: "15:00",
      status: "PENDING",
      totalPrice: haircut?.price ?? 15,
    },
  ];
}

function dentistAppointments(shop: any, today: Date): DemoAppointment[] {
  const checkup = shop.services.find((s: any) => s.name.toLowerCase().includes("kontrola")) ?? shop.services[0];
  const cleaning = shop.services.find((s: any) => s.name.toLowerCase().includes("čišćenje")) ?? shop.services[0];
  const filling = shop.services.find((s: any) => s.name.toLowerCase().includes("plomba")) ?? shop.services[0];
  const staffA = shop.staff[0];
  return [
    {
      customerName: "Iva Marković", phone: "+385 95 111 1111", email: "iva@example.com",
      serviceId: checkup.id, staffId: staffA?.id ?? null,
      date: today, startTime: "09:00", endTime: "09:30",
      status: "CONFIRMED", notes: "Redovna kontrola — bez tegoba.",
      totalPrice: checkup.price,
    },
    {
      customerName: "Stjepan Jurić", phone: "+385 95 222 2222", email: null,
      serviceId: cleaning.id, staffId: staffA?.id ?? null,
      date: today, startTime: "10:30", endTime: "11:30",
      status: "CONFIRMED", notes: "Profesionalno čišćenje — godišnja.",
      totalPrice: cleaning.price,
    },
    {
      customerName: "Nikolina Pavić", phone: "+385 95 333 3333", email: "nikolina@example.com",
      serviceId: filling.id, staffId: staffA?.id ?? null,
      date: today, startTime: "14:00", endTime: "14:45",
      status: "CONFIRMED", notes: "Plomba — gornji desni kutnjak. Pacijentica anksiozna, najaviti polako.",
      totalPrice: filling.price,
    },
  ];
}

async function main() {
  console.log("\n=== QueueUp — Seed Demo Shops ===\n");
  console.log(`Seeding ${DEMOS.length} demo shops (idempotent — existing slugs skipped)...\n`);

  for (const spec of DEMOS) {
    try {
      await seedDemo(spec);
    } catch (err: any) {
      console.error(`  ✗ ${spec.slug}: failed — ${err.message}`);
    }
  }

  console.log(`\nDone. Demo password for all owners: ${DEMO_PASSWORD}`);
  console.log("\nBooking URLs:");
  for (const spec of DEMOS) {
    console.log(`  /booking/${spec.slug}`);
  }
  console.log("\nAdmin URLs:");
  for (const spec of DEMOS) {
    console.log(`  /admin/${spec.slug}/appointments  (login: ${spec.ownerEmail})`);
  }
  console.log();
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
