import sgMail from "@sendgrid/mail";

const FROM = { email: "info@queueup.me", name: "QueueUp" };

function getSgMail() {
  const key = process.env.SENDGRID_API_KEY;
  if (!key) {
    console.error("SENDGRID_API_KEY is not set");
    return null;
  }
  sgMail.setApiKey(key);
  return sgMail;
}

export async function sendPasswordResetEmail(to: string, resetLink: string, shopName: string) {
  const mail = getSgMail();
  if (!mail) return;
  await mail.send({
    to,
    from: FROM,
    subject: "Reset your password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9;">
        <h2 style="color: #111;">Reset your password</h2>
        <p style="color: #555;">Hi, you requested a password reset for your ${shopName} account on QueueUp.</p>
        <a href="${resetLink}" style="display: inline-block; margin: 24px 0; background: #84934A; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Reset Password</a>
        <p style="color: #888; font-size: 13px;">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

export async function sendAppointmentReminder({
  customerName,
  customerEmail,
  shopName,
  serviceName,
  staffName,
  date,
  startTime,
}: {
  customerName: string;
  customerEmail: string;
  shopName: string;
  serviceName: string;
  staffName?: string | null;
  date: Date;
  startTime: string;
}) {
  const mail = getSgMail();
  if (!mail) return;

  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const [hours, minutes] = startTime.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  const formattedTime = `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;

  await mail.send({
    to: customerEmail,
    from: FROM,
    subject: `Reminder: Your appointment tomorrow at ${formattedTime}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9;">
        <h2 style="color: #111; margin-bottom: 4px;">Appointment Reminder</h2>
        <p style="color: #555; margin-top: 0;">Hi ${customerName}, just a reminder that you have an appointment tomorrow.</p>
        <div style="background: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e0e0e0;">
          <p style="margin: 0 0 10px;"><strong>Shop:</strong> ${shopName}</p>
          <p style="margin: 0 0 10px;"><strong>Service:</strong> ${serviceName}</p>
          ${staffName ? `<p style="margin: 0 0 10px;"><strong>With:</strong> ${staffName}</p>` : ""}
          <p style="margin: 0 0 10px;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 0;"><strong>Time:</strong> ${formattedTime}</p>
        </div>
        <p style="color: #888; font-size: 13px;">Need to cancel? Contact ${shopName} as soon as possible.</p>
      </div>
    `,
  });
}

export async function sendBookingConfirmation({
  customerName,
  customerEmail,
  shopName,
  serviceName,
  staffName,
  date,
  startTime,
  totalPrice,
}: {
  customerName: string;
  customerEmail: string;
  shopName: string;
  serviceName: string;
  staffName?: string | null;
  date: Date;
  startTime: string;
  totalPrice: number;
}) {
  const mail = getSgMail();
  if (!mail) return;

  const formattedDate = new Date(date).toLocaleDateString("hr-HR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const [hours, minutes] = startTime.split(":").map(Number);
  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

  const text = `Pozdrav ${customerName},

Vaša rezervacija je uspješno potvrđena.

---

VAŠ TERMIN
Datum:    ${formattedDate}
Vrijeme:  ${formattedTime}
Usluga:   ${serviceName}${staffName ? `\nOsoblje:  ${staffName}` : ""}${totalPrice > 0 ? `\nCijena:   ${totalPrice.toFixed(2)} €` : ""}

---

MJESTO
${shopName}

---

Otkazivanje: Ako trebate otkazati ili promijeniti termin, kontaktirajte ${shopName} direktno.

© ${new Date().getFullYear()} ${shopName}`;

  try {
    await mail.send({
      to: customerEmail,
      from: FROM,
      subject: `Potvrda termina — ${shopName}`,
      text,
    });
  } catch (error) {
    console.error("Failed to send confirmation email:", error);
  }
}
