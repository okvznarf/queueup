import sgMail from "@sendgrid/mail";
import QRCode from "qrcode";
import type { BusinessCategory } from "../types/index.js";
import { logger } from "../lib/logger.js";

const DEMO_BOOKING_URL = "https://queueup.me/booking/demo-barber";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const CATEGORY_SUBJECTS: Record<BusinessCategory, string[]> = {
  barber: ["Koliko ti para ode jer klijenti ne dođu?", "Koliko no-showova imaš tjedno?"],
  spa: ["Koliko tretmana propadne jer klijenti ne dođu?", "Koliko ti para ode na prazne termine?"],
  restaurant: ["Koliko rezervacija propadne svaki vikend?", "Koliko stolova ostane prazno jer ljudi ne dođu?"],
  fitness: ["Koliko ljudi se prijavi a ne dođe na trening?", "Koliko ti para ode na prazne treninge?"],
  dentist: ["Koliko pacijenata ne dođe na termin?", "Koliko ti para ode jer pacijenti ne dođu?"],
  salon: ["Koliko ti para ode jer klijentice ne dođu?", "Koliko termina propadne tjedno?"],
  veterinary: ["Koliko vlasnika ne dođe na kontrolu?", "Koliko termina propadne jer vlasnici zaborave?"],
  other: ["Koliko ti para ode jer klijenti ne dođu?", "Koliko termina propadne tjedno?"],
};

function pickSubject(category: BusinessCategory): string {
  const options = CATEGORY_SUBJECTS[category];
  return options[Math.floor(Math.random() * options.length)];
}

async function generateQrCodeBase64(): Promise<string> {
  const dataUrl = await QRCode.toDataURL(DEMO_BOOKING_URL, {
    width: 200,
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });
  // Strip "data:image/png;base64," prefix to get raw base64
  return dataUrl.replace(/^data:image\/png;base64,/, "");
}

function buildHtml(message: string, senderEmail: string): string {
  const escapedMessage = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `
<div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #222; line-height: 1.6;">
  <div style="padding: 24px 0;">
    <p style="margin: 0;">${escapedMessage}</p>
  </div>
  <div style="padding: 16px 0; text-align: center;">
    <p style="margin: 0 0 8px; color: #555; font-size: 14px;">Vidi kako izgleda u praksi:</p>
    <img src="cid:qrcode" alt="QR kod za demo" style="width: 180px; height: 180px;" />
    <p style="margin: 8px 0 0; color: #888; font-size: 12px;">Skeniraj ili klikni: <a href="${DEMO_BOOKING_URL}" style="color: #84934A;">${DEMO_BOOKING_URL}</a></p>
  </div>
  <div style="border-top: 1px solid #eee; padding-top: 16px; color: #999; font-size: 12px;">
    <p style="margin: 0 0 4px;">${senderEmail}</p>
    <p style="margin: 0;">
      <a href="mailto:${senderEmail}?subject=Odjava" style="color: #999;">Odjava</a>
    </p>
  </div>
</div>`;
}

export interface SendEmailOptions {
  to: string;
  businessName: string;
  category: BusinessCategory;
  message: string;
  subject?: string;
}

export async function sendOutreachEmail(opts: SendEmailOptions): Promise<void> {
  const senderEmail = process.env.SENDER_EMAIL!;
  const senderName = process.env.SENDER_NAME ?? "Fran";
  const subject = opts.subject ?? pickSubject(opts.category);

  const qrBase64 = await generateQrCodeBase64();

  const msg = {
    to: opts.to,
    from: { email: senderEmail, name: senderName },
    subject,
    text: opts.message + `\n\nDemo booking: ${DEMO_BOOKING_URL}\n\n---\nOdjava: ${senderEmail}`,
    html: buildHtml(opts.message, senderEmail),
    attachments: [
      {
        content: qrBase64,
        filename: "qrcode.png",
        type: "image/png",
        disposition: "inline" as const,
        content_id: "qrcode",
      },
    ],
  };

  await sgMail.send(msg);
  logger.info(`Email sent to ${opts.to} (${opts.businessName})`);
}
