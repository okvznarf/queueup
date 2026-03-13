export type BusinessTypeConfig = {
  type: string;
  icon: string;
  staffLabel: string;
  serviceLabel: string;
  bookingLabel: string;
  showStaffPicker: boolean;
  showPartySize: boolean;
  showVehicleInfo: boolean;
  defaultServices: { name: string; duration: number; price: number; icon: string }[];
};

export const BUSINESS_CONFIGS: Record<string, BusinessTypeConfig> = {
  BARBER: {
    type: "BARBER", icon: "barber", staffLabel: "Barber", serviceLabel: "Service",
    bookingLabel: "Appointment", showStaffPicker: true, showPartySize: false, showVehicleInfo: false,
    defaultServices: [
      { name: "Classic Cut", duration: 30, price: 35, icon: "scissors" },
      { name: "Skin Fade", duration: 45, price: 40, icon: "barber" },
      { name: "Beard Trim", duration: 20, price: 20, icon: "razor" },
      { name: "Cut + Beard", duration: 50, price: 50, icon: "star" },
    ],
  },
  RESTAURANT: {
    type: "RESTAURANT", icon: "dining", staffLabel: "Server", serviceLabel: "Experience",
    bookingLabel: "Reservation", showStaffPicker: false, showPartySize: true, showVehicleInfo: false,
    defaultServices: [
      { name: "Standard Dining", duration: 60, price: 0, icon: "dining" },
      { name: "Private Room", duration: 120, price: 50, icon: "room" },
      { name: "Chefs Table", duration: 90, price: 100, icon: "chef" },
    ],
  },
  MECHANIC: {
    type: "MECHANIC", icon: "wrench", staffLabel: "Technician", serviceLabel: "Repair Type",
    bookingLabel: "Service Appointment", showStaffPicker: true, showPartySize: false, showVehicleInfo: true,
    defaultServices: [
      { name: "Oil Change", duration: 30, price: 45, icon: "oil" },
      { name: "Tire Rotation", duration: 45, price: 35, icon: "tire" },
      { name: "Brake Inspection", duration: 60, price: 80, icon: "brake" },
    ],
  },
  SALON: {
    type: "SALON", icon: "salon", staffLabel: "Stylist", serviceLabel: "Treatment",
    bookingLabel: "Appointment", showStaffPicker: true, showPartySize: false, showVehicleInfo: false,
    defaultServices: [
      { name: "Haircut and Style", duration: 45, price: 55, icon: "scissors" },
      { name: "Color Treatment", duration: 120, price: 120, icon: "color" },
      { name: "Blowout", duration: 30, price: 40, icon: "blow" },
    ],
  },
  DENTIST: {
    type: "DENTIST", icon: "tooth", staffLabel: "Doctor", serviceLabel: "Treatment",
    bookingLabel: "Appointment", showStaffPicker: true, showPartySize: false, showVehicleInfo: false,
    defaultServices: [
      { name: "Cleaning", duration: 45, price: 100, icon: "clean" },
      { name: "Check-up", duration: 30, price: 75, icon: "checkup" },
      { name: "Whitening", duration: 60, price: 250, icon: "whiten" },
    ],
  },
  FITNESS: {
    type: "FITNESS", icon: "fitness", staffLabel: "Trainer", serviceLabel: "Session",
    bookingLabel: "Booking", showStaffPicker: true, showPartySize: false, showVehicleInfo: false,
    defaultServices: [
      { name: "Personal Training", duration: 60, price: 80, icon: "train" },
      { name: "Group Class", duration: 45, price: 25, icon: "group" },
      { name: "Yoga", duration: 60, price: 30, icon: "yoga" },
    ],
  },
};

export type TimeSlot = {
  hour: number;
  minute: number;
  label: string;
  available: boolean;
};

export type ShopConfig = {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  primaryColor: string;
  darkMode: boolean;
  staffLabel: string;
  serviceLabel: string;
  bookingLabel: string;
  showStaffPicker: boolean;
  showPartySize: boolean;
  showVehicleInfo: boolean;
};
