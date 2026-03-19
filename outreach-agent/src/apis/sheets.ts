import { google } from "googleapis";
import type { Lead } from "../types/index.js";
import { logger } from "../lib/logger.js";
import fs from "fs";

const SHEET_NAME = "Leads";
const HEADERS = [
  "Business Name", "Category", "City", "Website", "Email",
  "Search Date", "Message Status", "Date Sent", "First Contact Message",
  "Reply Status", "Reply Date", "Reply Content", "Campaign ID", "Notes",
];

function getAuth() {
  const credsPath = process.env.GOOGLE_SHEETS_CREDENTIALS!;
  const creds = JSON.parse(fs.readFileSync(credsPath, "utf-8"));
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
}

async function getSheets() {
  const auth = await getAuth().getClient();
  return google.sheets({ version: "v4", auth: auth as any });
}

export async function ensureSheetExists(): Promise<void> {
  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID!;

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const exists = meta.data.sheets?.some((s) => s.properties?.title === SHEET_NAME);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: SHEET_NAME } } }],
      },
    });
    // Write headers
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
    logger.info("Created Leads sheet with headers");
  }
}

export async function getAllLeads(): Promise<Lead[]> {
  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID!;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A2:N`,
  });

  const rows = res.data.values ?? [];
  return rows.map((row, index) => ({
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
    sheetRow: index + 2,
  }));
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
  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID!;

  const row = [
    lead.businessName, lead.category, lead.city, lead.website, lead.email,
    lead.searchDate, lead.messageStatus, lead.dateSent ?? "",
    lead.firstContactMessage ?? "", lead.replyStatus,
    lead.replyDate ?? "", lead.replyContent ?? "",
    lead.campaignId ?? "", lead.notes ?? "",
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A:N`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });

  logger.info(`Appended lead: ${lead.businessName} (${lead.city})`);
}

export async function updateLeadStatus(
  rowNumber: number,
  updates: Partial<Pick<Lead, "messageStatus" | "dateSent" | "firstContactMessage" | "replyStatus" | "replyDate" | "replyContent">>,
): Promise<void> {
  const sheets = await getSheets();
  const spreadsheetId = process.env.SPREADSHEET_ID!;

  // Read current row first
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${SHEET_NAME}!A${rowNumber}:N${rowNumber}`,
  });

  const row: string[] = (res.data.values?.[0] ?? new Array(14).fill("")) as string[];

  if (updates.messageStatus !== undefined) row[6] = updates.messageStatus;
  if (updates.dateSent !== undefined) row[7] = updates.dateSent;
  if (updates.firstContactMessage !== undefined) row[8] = updates.firstContactMessage;
  if (updates.replyStatus !== undefined) row[9] = updates.replyStatus;
  if (updates.replyDate !== undefined) row[10] = updates.replyDate;
  if (updates.replyContent !== undefined) row[11] = updates.replyContent;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_NAME}!A${rowNumber}:N${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [row] },
  });

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
