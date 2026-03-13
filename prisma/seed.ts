import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const barber = await prisma.shop.create({
    data: {
      name: "Sharp & Co.",
      slug: "sharp-and-co",
      businessType: "BARBER",
      description: "Premium barbershop",
      phone: "+1 (555) 100-0001",
      email: "hello@sharpandco.com",
      address: "123 Main Street",
      city: "Brooklyn",
      state: "NY",
      zipCode: "11201",
      primaryColor: "#C8A45A",
      darkMode: true,
      staffLabel: "Barber",
      serviceLabel: "Service",
      bookingLabel: "Appointment",
      showStaffPicker: true,
      showPartySize: false,
      showVehicleInfo: false,
      staff: {
        create: [
          { name: "Marcus Cole", role: "Master Barber", sortOrder: 1 },
          { name: "Deon Williams", role: "Senior Stylist", sortOrder: 2 },
          { name: "Ray Santos", role: "Fade Specialist", sortOrder: 3 },
        ],
      },
      services: {
        create: [
          { name: "Classic Cut", duration: 30, price: 35, icon: "scissors", sortOrder: 1 },
          { name: "Skin Fade", duration: 45, price: 40, icon: "barber", sortOrder: 2 },
          { name: "Beard Trim", duration: 20, price: 20, icon: "razor", sortOrder: 3 },
          { name: "Cut + Beard", duration: 50, price: 50, icon: "star", sortOrder: 4 },
          { name: "Hot Towel Shave", duration: 30, price: 30, icon: "hot", sortOrder: 5 },
          { name: "Kids Cut", duration: 25, price: 25, icon: "kid", sortOrder: 6 },
        ],
      },
      workingHours: {
        create: [
          { day: "MONDAY", openTime: "09:00", closeTime: "20:00" },
          { day: "TUESDAY", openTime: "09:00", closeTime: "20:00" },
          { day: "WEDNESDAY", openTime: "09:00", closeTime: "20:00" },
          { day: "THURSDAY", openTime: "09:00", closeTime: "20:00" },
          { day: "FRIDAY", openTime: "09:00", closeTime: "20:00" },
          { day: "SATURDAY", openTime: "09:00", closeTime: "17:00" },
          { day: "SUNDAY", openTime: "09:00", closeTime: "17:00", isClosed: true },
        ],
      },
    },
  });
  console.log("Created: " + barber.name);

  const restaurant = await prisma.shop.create({
    data: {
      name: "Ember & Oak",
      slug: "ember-and-oak",
      businessType: "RESTAURANT",
      description: "Contemporary dining",
      phone: "+1 (555) 200-0002",
      email: "reservations@emberandoak.com",
      address: "456 Oak Avenue",
      city: "Manhattan",
      state: "NY",
      zipCode: "10012",
      primaryColor: "#D4644E",
      darkMode: true,
      staffLabel: "Server",
      serviceLabel: "Experience",
      bookingLabel: "Reservation",
      showStaffPicker: false,
      showPartySize: true,
      showVehicleInfo: false,
      services: {
        create: [
          { name: "Standard Dining", duration: 60, price: 0, icon: "dining", sortOrder: 1 },
          { name: "Private Room", duration: 120, price: 50, icon: "room", sortOrder: 2 },
          { name: "Chefs Table", duration: 90, price: 100, icon: "chef", sortOrder: 3 },
          { name: "Bar Seating", duration: 45, price: 0, icon: "bar", sortOrder: 4 },
          { name: "Brunch", duration: 75, price: 0, icon: "brunch", sortOrder: 5 },
          { name: "Tasting Menu", duration: 120, price: 150, icon: "tasting", sortOrder: 6 },
        ],
      },
      workingHours: {
        create: [
          { day: "MONDAY", openTime: "11:00", closeTime: "22:00" },
          { day: "TUESDAY", openTime: "11:00", closeTime: "22:00" },
          { day: "WEDNESDAY", openTime: "11:00", closeTime: "22:00" },
          { day: "THURSDAY", openTime: "11:00", closeTime: "23:00" },
          { day: "FRIDAY", openTime: "11:00", closeTime: "23:00" },
          { day: "SATURDAY", openTime: "10:00", closeTime: "23:00" },
          { day: "SUNDAY", openTime: "10:00", closeTime: "21:00" },
        ],
      },
    },
  });
  console.log("Created: " + restaurant.name);

  const mechanic = await prisma.shop.create({
    data: {
      name: "Iron Works Auto",
      slug: "iron-works-auto",
      businessType: "MECHANIC",
      description: "Trusted auto repair",
      phone: "+1 (555) 300-0003",
      email: "service@ironworksauto.com",
      address: "789 Industrial Blvd",
      city: "Queens",
      state: "NY",
      zipCode: "11101",
      primaryColor: "#4A9EE5",
      darkMode: true,
      staffLabel: "Technician",
      serviceLabel: "Repair Type",
      bookingLabel: "Service Appointment",
      showStaffPicker: true,
      showPartySize: false,
      showVehicleInfo: true,
      staff: {
        create: [
          { name: "Jake Torres", role: "Lead Mechanic", sortOrder: 1 },
          { name: "Mike Chen", role: "Diagnostics", sortOrder: 2 },
          { name: "Sarah Kim", role: "Tire & Brakes", sortOrder: 3 },
        ],
      },
      services: {
        create: [
          { name: "Oil Change", duration: 30, price: 45, icon: "oil", sortOrder: 1 },
          { name: "Tire Rotation", duration: 45, price: 35, icon: "tire", sortOrder: 2 },
          { name: "Brake Inspection", duration: 60, price: 80, icon: "brake", sortOrder: 3 },
          { name: "Full Diagnostic", duration: 90, price: 120, icon: "diagnostic", sortOrder: 4 },
          { name: "AC Service", duration: 60, price: 95, icon: "ac", sortOrder: 5 },
          { name: "Battery Replace", duration: 20, price: 150, icon: "battery", sortOrder: 6 },
        ],
      },
      workingHours: {
        create: [
          { day: "MONDAY", openTime: "08:00", closeTime: "18:00" },
          { day: "TUESDAY", openTime: "08:00", closeTime: "18:00" },
          { day: "WEDNESDAY", openTime: "08:00", closeTime: "18:00" },
          { day: "THURSDAY", openTime: "08:00", closeTime: "18:00" },
          { day: "FRIDAY", openTime: "08:00", closeTime: "18:00" },
          { day: "SATURDAY", openTime: "09:00", closeTime: "14:00" },
          { day: "SUNDAY", openTime: "09:00", closeTime: "14:00", isClosed: true },
        ],
      },
    },
  });
  console.log("Created: " + mechanic.name);

  console.log("\nSeeding complete! 3 demo shops created.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });