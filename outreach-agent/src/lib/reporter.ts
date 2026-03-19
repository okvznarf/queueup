import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { CampaignReport, Lead } from "../types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = path.join(__dirname, "../../reports");

fs.mkdirSync(REPORTS_DIR, { recursive: true });

export function saveCampaignReport(report: CampaignReport): string {
  const file = path.join(REPORTS_DIR, `campaign-${report.campaignId}.json`);
  fs.writeFileSync(file, JSON.stringify(report, null, 2));
  return file;
}

export function exportLeadsToCsv(leads: Lead[]): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = path.join(REPORTS_DIR, `sheets-export-${timestamp}.csv`);

  const headers = [
    "Business Name", "Category", "City", "Website", "Email",
    "Search Date", "Message Status", "Date Sent", "Reply Status",
    "Reply Date", "Campaign ID", "Notes",
  ];

  const rows = leads.map((l) => [
    l.businessName, l.category, l.city, l.website, l.email,
    l.searchDate, l.messageStatus, l.dateSent ?? "",
    l.replyStatus, l.replyDate ?? "", l.campaignId ?? "", l.notes ?? "",
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));

  fs.writeFileSync(file, [headers.join(","), ...rows].join("\n"));
  return file;
}
