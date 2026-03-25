import sgMail from "@sendgrid/mail";
import { withRetry, isTransientError, circuits, CircuitOpenError } from "./resilience";
import { logger } from "./logger";

// ─── Email Provider Interface (Dependency Injection) ────────────────────────
// To swap providers: implement this interface and call setEmailProvider()
// Supported: SendGrid (default), Resend, Mailgun, or any SMTP

export interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface EmailProvider {
  send(msg: EmailMessage): Promise<void>;
}

// ─── SendGrid Provider (default) ────────────────────────────────────────────

class SendGridProvider implements EmailProvider {
  private initialized = false;

  private init() {
    if (this.initialized) return true;
    const key = process.env.SENDGRID_API_KEY;
    if (!key) {
      logger.error("SENDGRID_API_KEY is not set", "email:config");
      return false;
    }
    sgMail.setApiKey(key);
    this.initialized = true;
    return true;
  }

  async send(msg: EmailMessage): Promise<void> {
    if (!this.init()) return;
    await sgMail.send({ ...msg, from: FROM } as sgMail.MailDataRequired);
  }
}

// ─── Provider Registry ──────────────────────────────────────────────────────

const FROM = { email: process.env.EMAIL_FROM || "info@queueup.me", name: process.env.EMAIL_FROM_NAME || "QueueUp" };
let provider: EmailProvider = new SendGridProvider();

// Call this to swap email provider (e.g. in tests or migration)
export function setEmailProvider(p: EmailProvider) {
  provider = p;
}

// Resilient send: retry transient failures + circuit breaker
async function sendMail(msg: EmailMessage): Promise<void> {
  try {
    await circuits.sendgrid.call(() =>
      withRetry(() => provider.send(msg), {
        maxRetries: 3,
        baseDelayMs: 1000,
        retryOn: isTransientError,
      })
    );
  } catch (err) {
    if (err instanceof CircuitOpenError) {
      logger.warn(`SendGrid circuit open — skipping email to ${msg.to}`, "email:sendgrid");
      return;
    }
    throw err;
  }
}

// ─── Email Functions (unchanged API — nothing else needs to change) ─────────

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendWelcomeEmail({
  customerName,
  customerEmail,
  shopName,
  loginUrl,
}: {
  customerName: string;
  customerEmail: string;
  shopName: string;
  loginUrl: string;
}) {
  const text = `Pozdrav ${customerName},

Dobrodošli na QueueUp! Vaš račun za ${shopName} je uspješno kreiran.

---

VAŠ RAČUN
Email:    ${customerEmail}

---

Sada možete:
- Rezervirati termine online
- Pratiti svoje nadolazeće termine
- Upravljati svojim rezervacijama

Prijavite se ovdje: ${loginUrl}

---

Ako niste kreirali ovaj račun, možete ignorirati ovaj email.

© ${new Date().getFullYear()} ${shopName}`;

  try {
    await sendMail({ to: customerEmail, subject: `Dobrodošli na ${shopName}!`, text });
  } catch (error) {
    logger.error("Failed to send welcome email", "email:welcome", error);
  }
}

export async function sendPasswordResetEmail(to: string, resetLink: string, shopName: string) {
  await sendMail({
    to,
    subject: "Reset your password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9;">
        <h2 style="color: #111;">Reset your password</h2>
        <p style="color: #555;">Hi, you requested a password reset for your ${escapeHtml(shopName)} account on QueueUp.</p>
        <a href="${encodeURI(resetLink)}" style="display: inline-block; margin: 24px 0; background: #84934A; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700;">Reset Password</a>
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
  reminderType = "24h",
}: {
  customerName: string;
  customerEmail: string;
  shopName: string;
  serviceName: string;
  staffName?: string | null;
  date: Date;
  startTime: string;
  reminderType?: "24h" | "1h";
}) {
  const formattedDate = new Date(date).toLocaleDateString("hr-HR", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const [hours, minutes] = startTime.split(":").map(Number);
  const formattedTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

  const urgency = reminderType === "1h"
    ? "Podsjećamo vas da imate termin za 1 sat."
    : "Podsjećamo vas da imate termin sutra.";

  const text = `Pozdrav ${customerName},

${urgency}

---

VAŠ TERMIN
Datum:    ${formattedDate}
Vrijeme:  ${formattedTime}
Usluga:   ${serviceName}${staffName ? `\nOsoblje:  ${staffName}` : ""}

---

MJESTO
${shopName}

---

Otkazivanje: Ako trebate otkazati ili promijeniti termin, kontaktirajte ${shopName} što prije.

© ${new Date().getFullYear()} ${shopName}`;

  const subject = reminderType === "1h"
    ? `Termin za 1 sat — ${shopName}`
    : `Podsjetnik za termin — ${shopName}`;

  await sendMail({ to: customerEmail, subject, text });
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
    await sendMail({ to: customerEmail, subject: `Potvrda termina — ${shopName}`, text });
  } catch (error) {
    logger.error("Failed to send confirmation email", "email:confirmation", error);
  }
}
