import prisma from "./prisma";

export type TimeSlot = {
  hour: number;
  minute: number;
  label: string;
  available: boolean;
  startTime: string;
};

export async function getAvailableSlots(
  shopId: string,
  date: Date,
  staffId?: string | null,
  serviceDuration: number = 30
): Promise<TimeSlot[]> {
  const dayNames = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  const dayName = dayNames[date.getDay()];

  const workingHours = await prisma.workingHours.findUnique({
    where: { shopId_day: { shopId, day: dayName as any } },
  });

  if (!workingHours || workingHours.isClosed) return [];

  const [openH, openM] = workingHours.openTime.split(":").map(Number);
  const [closeH, closeM] = workingHours.closeTime.split(":").map(Number);

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const where: any = {
    shopId,
    date: { gte: startOfDay, lte: endOfDay },
    status: { notIn: ["CANCELLED"] },
  };
  if (staffId) where.staffId = staffId;

  const existingAppointments = await prisma.appointment.findMany({
    where,
    select: { startTime: true, endTime: true },
  });

  const bookedSlots = existingAppointments.map((apt) => ({
    start: timeToMinutes(apt.startTime),
    end: timeToMinutes(apt.endTime),
  }));

  const slots: TimeSlot[] = [];
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  for (let m = openMinutes; m + serviceDuration <= closeMinutes; m += 30) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const startTime = h.toString().padStart(2, "0") + ":" + min.toString().padStart(2, "0");
    const slotEnd = m + serviceDuration;

    const isBooked = bookedSlots.some(
      (b) => m < b.end && slotEnd > b.start
    );

    const now = new Date();
    const slotDate = new Date(date);
    slotDate.setHours(h, min, 0, 0);
    const isPast = slotDate < now;

    slots.push({
      hour: h,
      minute: min,
      label: formatTime(h, min),
      available: !isBooked && !isPast,
      startTime,
    });
  }

  return slots;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(h: number, m: number): string {
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return displayH + ":" + (m === 0 ? "00" : String(m)) + " " + period;
}