import sgMail from "@sendgrid/mail";

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
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
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) return;

  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const [hours, minutes] = startTime.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  const formattedTime = `${displayHour}:${minutes.toString().padStart(2, "0")} ${period}`;

  const msg = {
    to: customerEmail,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject: `Booking Confirmed — ${shopName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #f9f9f9;">
        <h2 style="color: #111; margin-bottom: 4px;">Booking Confirmed</h2>
        <p style="color: #555; margin-top: 0;">Hi ${customerName}, your appointment is booked.</p>

        <div style="background: #fff; border-radius: 8px; padding: 24px; margin: 24px 0; border: 1px solid #e0e0e0;">
          <p style="margin: 0 0 12px;"><strong>Shop:</strong> ${shopName}</p>
          <p style="margin: 0 0 12px;"><strong>Service:</strong> ${serviceName}</p>
          ${staffName ? `<p style="margin: 0 0 12px;"><strong>With:</strong> ${staffName}</p>` : ""}
          <p style="margin: 0 0 12px;"><strong>Date:</strong> ${formattedDate}</p>
          <p style="margin: 0 0 12px;"><strong>Time:</strong> ${formattedTime}</p>
          <p style="margin: 0;"><strong>Price:</strong> $${(totalPrice / 100).toFixed(2)}</p>
        </div>

        <p style="color: #888; font-size: 13px;">If you need to cancel or reschedule, please contact ${shopName} directly.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error("Failed to send confirmation email:", error);
  }
}
