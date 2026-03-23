import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Lead } from "../types/index.js";
import { logger } from "../lib/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.join(__dirname, "../../leads.csv");

const HEADERS = [
  "Business Name", "Category", "City", "Website", "Email",
  "Search Date", "Message Status", "Date Sent", "First Contact Message",
  "Reply Status", "Reply Date", "Reply Content", "Campaign ID", "Notes",
];

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields;
}

export async function ensureSheetExists(): Promise<void> {
  if (!fs.existsSync(CSV_PATH)) {
    fs.writeFileSync(CSV_PATH, HEADERS.join(",") + "\n", "utf-8");
    logger.info(`Created leads.csv at ${CSV_PATH}`);
  }
}

export async function getAllLeads(): Promise<Lead[]> {
  if (!fs.existsSync(CSV_PATH)) return [];

  const content = fs.readFileSync(CSV_PATH, "utf-8").trim();
  const lines = content.split("\n");
  if (lines.length <= 1) return []; // only headers

  return lines.slice(1).map((line, index) => {
    const row = parseCsvLine(line);
    return {
      businessName: row[0] ?? "",
      category: (row[1] ?? "other") as Lead["category"],
      city: row[2] ?? "",
      website: row[3] ?? "",
      email: row[4] ?? "",
      searchDate: row[5] ?? "",
      messageStatus: (row[6] ?? "Not Sent") as Lead["messageStatus"],
      dateSent: row[7] ?? "",
      firstContactMessage: row[8] ?? "",
      replyStatus: (row[9] ?? "No Reply") as Lead["replyStatus"],
      replyDate: row[10] ?? "",
      replyContent: row[11] ?? "",
      campaignId: row[12] ?? "",
      notes: row[13] ?? "",
      sheetRow: index + 2, // 1-based, skip header
    };
  });
}

export async function isDuplicate(businessName: string, city: string): Promise<boolean> {
  const leads = await getAllLeads();
  return leads.some(
    (l) =>
      l.businessName.toLowerCase() === businessName.toLowerCase() &&
      l.city.toLowerCase() === city.toLowerCase(),
  );
}

export async function appendLead(lead: Lead): Promise<void> {
  await ensureSheetExists();

  const row = [
    lead.businessName, lead.category, lead.city, lead.website, lead.email,
    lead.searchDate, lead.messageStatus, lead.dateSent ?? "",
    lead.firstContactMessage ?? "", lead.replyStatus,
    lead.replyDate ?? "", lead.replyContent ?? "",
    lead.campaignId ?? "", lead.notes ?? "",
  ].map(escapeCsv);

  fs.appendFileSync(CSV_PATH, row.join(",") + "\n", "utf-8");
  logger.info(`Appended lead: ${lead.businessName} (${lead.city})`);
}

export async function updateLeadStatus(
  rowNumber: number,
  updates: Partial<Pick<Lead, "messageStatus" | "dateSent" | "firstContactMessage" | "replyStatus" | "replyDate" | "replyContent">>,
): Promise<void> {
  const content = fs.readFileSync(CSV_PATH, "utf-8").trim();
  const lines = content.split("\n");

  const lineIndex = rowNumber - 1; // rowNumber is 1-based (header = 1)
  if (lineIndex < 1 || lineIndex >= lines.length) return;

  const row = parseCsvLine(lines[lineIndex]);

  if (updates.messageStatus !== undefined) row[6] = updates.messageStatus;
  if (updates.dateSent !== undefined) row[7] = updates.dateSent;
  if (updates.firstContactMessage !== undefined) row[8] = updates.firstContactMessage;
  if (updates.replyStatus !== undefined) row[9] = updates.replyStatus;
  if (updates.replyDate !== undefined) row[10] = updates.replyDate;
  if (updates.replyContent !== undefined) row[11] = updates.replyContent;

  lines[lineIndex] = row.map(escapeCsv).join(",");
  fs.writeFileSync(CSV_PATH, lines.join("\n") + "\n", "utf-8");

  logger.info(`Updated row ${rowNumber}: ${JSON.stringify(updates)}`);
}

export async function getLeadsDueForFollowUp(daysSinceContact: number): Promise<Lead[]> {
  const leads = await getAllLeads();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysSinceContact);

  return leads.filter((l) => {
    if (l.messageStatus !== "Sent") return false;
    if (l.replyStatus !== "No Reply") return false;
    if (!l.dateSent) return false;
    const sent = new Date(l.dateSent);
    return sent <= cutoff;
  });
}
