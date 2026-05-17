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

// ─── Usage alerts (Option B billing model) ──────────────────────────────────

export async function sendUsageAlert({
  ownerEmail,
  ownerName,
  shopName,
  level,
  used,
  included,
  overageRateEur,
  projectedOverageCalls,
  projectedOverageCostEur,
  daysLeftInPeriod,
  dashboardUrl,
}: {
  ownerEmail: string;
  ownerName: string;
  shopName: string;
  level: 80 | 100;
  used: number;
  included: number;
  overageRateEur: number;
  projectedOverageCalls: number;
  projectedOverageCostEur: number;
  daysLeftInPeriod: number;
  dashboardUrl: string;
}) {
  const is80 = level === 80;
  const subject = is80
    ? `${shopName}: 80% of your AI call quota used`
    : `${shopName}: AI quota reached — overage charges apply`;

  const headline = is80
    ? `You've used 80% of this month's included AI calls.`
    : `You've used 100% of this month's included AI calls.`;

  const body = is80
    ? `Used ${used} of ${included} calls. At your current pace you'll exceed the quota by about ${projectedOverageCalls} calls before the period resets in ${daysLeftInPeriod} day${daysLeftInPeriod === 1 ? "" : "s"} — that's roughly €${projectedOverageCostEur.toFixed(2)} in overage at €${overageRateEur.toFixed(2)} per call.

No action needed right now. We're flagging it early so you're not surprised on your next invoice.`
    : `Used ${used} of ${included} calls. Additional calls this period are billed at €${overageRateEur.toFixed(2)} each. Period resets in ${daysLeftInPeriod} day${daysLeftInPeriod === 1 ? "" : "s"}.

The AI receptionist continues to handle calls normally — it doesn't shut off at the quota. We just want you to see what's coming.`;

  const text = `Hi ${ownerName || "there"},

${headline}

${body}

See full usage: ${dashboardUrl}

Questions? Reply to this email.

— QueueUp`;

  try {
    await sendMail({ to: ownerEmail, subject, text });
  } catch (error) {
    logger.error(`Failed to send ${level}% usage alert`, "email:usage", error);
  }
}

// ─── Trial lifecycle emails ─────────────────────────────────────────────────

export async function sendTrialReminder({
  ownerEmail,
  ownerName,
  shopName,
  daysLeft,
  billingUrl,
}: {
  ownerEmail: string;
  ownerName: string;
  shopName: string;
  daysLeft: 7 | 1;
  billingUrl: string;
}) {
  const subject = daysLeft === 7
    ? `Your QueueUp trial ends in 7 days`
    : `Your QueueUp trial ends tomorrow`;

  const headline = daysLeft === 7
    ? `Your free trial for ${shopName} ends in a week.`
    : `Your free trial for ${shopName} ends tomorrow.`;

  const cta = daysLeft === 7
    ? `Add a payment method now so your AI receptionist keeps running without interruption when the trial ends. No charge today — Stripe just keeps the card on file for your first invoice next week.`
    : `Add a payment method today to avoid losing AI receptionist coverage tomorrow. We don't charge anything before your trial ends — this just keeps the lights on.`;

  const text = `Hi ${ownerName || "there"},

${headline}

${cta}

Add payment method: ${billingUrl}

Questions? Reply to this email.

— QueueUp`;

  try {
    await sendMail({ to: ownerEmail, subject, text });
  } catch (error) {
    logger.error(`Failed to send ${daysLeft}-day trial reminder`, "email:trial", error);
  }
}

export async function sendTrialEnded({
  ownerEmail,
  ownerName,
  shopName,
  billingUrl,
}: {
  ownerEmail: string;
  ownerName: string;
  shopName: string;
  billingUrl: string;
}) {
  const subject = `Your QueueUp trial has ended — AI receptionist paused`;

  const text = `Hi ${ownerName || "there"},

Your free trial for ${shopName} ended today. Because we don't have a payment method on file, your AI receptionist is now paused.

Your booking page is still live and customers can still book online. But incoming calls won't be answered by the AI until you add a card.

Reactivate in one click: ${billingUrl}

Welcome back any time. If you decided QueueUp isn't right for you, no hard feelings — just let me know and I'll close the account cleanly.

— QueueUp`;

  try {
    await sendMail({ to: ownerEmail, subject, text });
  } catch (error) {
    logger.error("Failed to send trial-ended email", "email:trial", error);
  }
}
