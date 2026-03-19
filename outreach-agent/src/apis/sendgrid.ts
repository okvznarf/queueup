import sgMail from "@sendgrid/mail";
import type { BusinessCategory } from "../types/index.js";
import { logger } from "../lib/logger.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const CATEGORY_SUBJECTS: Record<BusinessCategory, string[]> = {
  barber: ["Pitanje oko vaših termina?", "Samo brza pitanja – kako upravljate zakazivanjem?"],
  spa: ["Zanimljiv je vaš salon 👋", "Pitanje oko vaših tretmana?"],
  restaurant: ["Kako upravljate rezervacijama?", "Brzo pitanje o vašem restoranu"],
  fitness: ["Pitanje oko grupnih treninga?", "Zanimljiv je vaš studio 👋"],
  dentist: ["Pitanje oko organizacije termina?", "Brzo pitanje o vašoj ordinaciji"],
  salon: ["Zanimljiv je vaš salon 👋", "Pitanje oko vaših termina?"],
  veterinary: ["Pitanje oko vaše ordinacije?", "Brzo pitanje za vas"],
  other: ["Samo brza pitanja?", "Hej, zanima me vaše poslovanje 👋"],
};

function pickSubject(category: BusinessCategory): string {
  const options = CATEGORY_SUBJECTS[category];
  return options[Math.floor(Math.random() * options.length)];
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

  const msg = {
    to: opts.to,
    from: { email: senderEmail, name: senderName },
    subject,
    text: opts.message + `\n\n---\nOdjava: ${senderEmail}`,
    html: buildHtml(opts.message, senderEmail),
  };

  await sgMail.send(msg);
  logger.info(`Email sent to ${opts.to} (${opts.businessName})`);
}
