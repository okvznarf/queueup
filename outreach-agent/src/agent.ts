import "dotenv/config";
import { program } from "commander";
import readline from "readline";
import fs from "fs";
import type { BusinessCategory, CampaignConfig, CampaignReport, Lead } from "./types/index.js";
import { logger } from "./lib/logger.js";
import { extractEmailFromWebsite } from "./lib/emailExtractor.js";
import { saveCampaignReport, exportLeadsToCsv } from "./lib/reporter.js";
import { searchBusinesses, parseBusinessName } from "./apis/serper.js";
import { ensureSheetExists, appendLead, isDuplicate, updateLeadStatus, getLeadsDueForFollowUp, getAllLeads } from "./apis/sheets.js";
import { generatePitch, getFollowUpMessage } from "./apis/claude.js";
import { sendOutreachEmail } from "./apis/sendgrid.js";

// ─── CLI Setup ────────────────────────────────────────────────────────────────

program
  .name("queueup-outreach")
  .description("QueueUp B2B outreach agent for Croatian SMEs")
  .option("--dry-run", "Preview without sending emails or writing to sheets")
  .option("--batch", "Run campaigns from config file")
  .option("--config <path>", "Config file for batch mode", "campaigns.json")
  .option("--followup", "Send follow-up emails to non-responders")
  .option("--days <number>", "Days since contact for follow-up", "3")
  .option("--category <category>", "Business category (for quick runs)")
  .option("--cities <cities>", "Comma-separated cities (for quick runs)")
  .option("--max-leads <number>", "Max leads per search", "10")
  .option("--test <integration>", "Test a specific integration: serper|sheets|sendgrid|claude")
  .option("--to <email>", "Email address for sendgrid test");

program.parse();
const opts = program.opts();

const isDryRun: boolean = opts.dryRun ?? false;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function validateEnv(keys: string[]) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// ─── Core Pipeline ────────────────────────────────────────────────────────────

async function processCampaign(config: CampaignConfig, dryRun: boolean): Promise<CampaignReport> {
  const report: CampaignReport = {
    campaignId: config.id,
    startedAt: new Date().toISOString(),
    searchesPerformed: 0,
    leadsFound: 0,
    emailsExtracted: 0,
    emailsSent: 0,
    emailsFailed: 0,
    errors: [],
  };

  if (!dryRun) {
    await ensureSheetExists();
  }

  for (const city of config.cities) {
    logger.info(`=== Processing: ${config.category} in ${city} ===`);

    let results;
    try {
      results = await searchBusinesses(config.category, city, config.maxLeads);
      report.searchesPerformed++;
    } catch (err) {
      const msg = `Serper search failed for ${config.category}/${city}: ${err}`;
      logger.error(msg);
      report.errors.push(msg);
      continue;
    }

    for (const result of results) {
      if (report.leadsFound >= config.maxLeads) break;

      const businessName = parseBusinessName(result);
      const website = result.link;

      // Duplicate check
      if (!dryRun && await isDuplicate(businessName, city)) {
        logger.info(`Skipping duplicate: ${businessName} (${city})`);
        continue;
      }

      // Extract email
      let email: string | null = null;
      try {
        email = await extractEmailFromWebsite(website);
      } catch (err) {
        logger.warn(`Email extraction failed for ${website}: ${err}`);
      }

      if (!email) {
        logger.info(`No email found for ${businessName} — skipping`);
        continue;
      }

      report.emailsExtracted++;
      report.leadsFound++;

      // Generate pitch
      let message: string;
      try {
        message = await generatePitch(businessName, config.category, city);
      } catch (err) {
        const msg = `Pitch generation failed for ${businessName}: ${err}`;
        logger.error(msg);
        report.errors.push(msg);
        continue;
      }

      const lead: Lead = {
        businessName,
        category: config.category,
        city,
        website,
        email,
        searchDate: new Date().toISOString().slice(0, 10),
        messageStatus: "Not Sent",
        replyStatus: "No Reply",
        campaignId: config.id,
      };

      if (dryRun) {
        console.log("\n" + "=".repeat(60));
        console.log(`[DRY RUN] Business: ${businessName} (${city})`);
        console.log(`Email: ${email}`);
        console.log(`Website: ${website}`);
        console.log(`\nMessage:\n${message}`);
        console.log("=".repeat(60));
        continue;
      }

      // Save to Sheets
      await appendLead({ ...lead, firstContactMessage: message });

      // Send email
      try {
        await sendOutreachEmail({ to: email, businessName, category: config.category, message });
        const leads = await getAllLeads();
        const savedLead = leads.find((l) => l.email === email && l.businessName === businessName);
        if (savedLead?.sheetRow) {
          await updateLeadStatus(savedLead.sheetRow, {
            messageStatus: "Sent",
            dateSent: new Date().toISOString().slice(0, 10),
            firstContactMessage: message,
          });
        }
        report.emailsSent++;
        logger.info(`Sent to ${businessName} <${email}>`);
      } catch (err) {
        const msg = `Failed to send to ${email}: ${err}`;
        logger.error(msg);
        report.errors.push(msg);
        report.emailsFailed++;
      }

      await sleep(config.delayBetweenEmails ?? 3000);
    }
  }

  report.completedAt = new Date().toISOString();
  const reportFile = saveCampaignReport(report);
  logger.info(`Campaign report saved: ${reportFile}`);
  return report;
}

// ─── Follow-Up Mode ───────────────────────────────────────────────────────────

async function runFollowUp(days: 3 | 7, dryRun: boolean) {
  logger.info(`Running follow-up mode (${days}-day)`);
  const leads = await getLeadsDueForFollowUp(days);
  logger.info(`Found ${leads.length} leads due for ${days}-day follow-up`);

  const message = getFollowUpMessage(days);

  for (const lead of leads) {
    if (!lead.email) continue;

    if (dryRun) {
      console.log(`\n[DRY RUN] Follow-up to: ${lead.businessName} <${lead.email}>`);
      console.log(message);
      continue;
    }

    try {
      await sendOutreachEmail({
        to: lead.email,
        businessName: lead.businessName,
        category: lead.category,
        message,
        subject: days === 3 ? "Samo da se javim 👋" : "Svaka čast na trudu! 💪",
      });
      if (lead.sheetRow) {
        await updateLeadStatus(lead.sheetRow, { replyStatus: "No Reply" });
      }
      logger.info(`Follow-up sent to ${lead.businessName}`);
    } catch (err) {
      logger.error(`Follow-up failed for ${lead.email}: ${err}`);
    }

    await sleep(3000);
  }
}

// ─── Integration Tests ────────────────────────────────────────────────────────

async function runTest(integration: string) {
  console.log(`Testing: ${integration}`);

  switch (integration) {
    case "serper": {
      validateEnv(["SERPER_API_KEY"]);
      const results = await searchBusinesses("barber", "Zagreb", 3);
      console.log("Serper OK. Sample result:", results[0]);
      break;
    }
    case "sheets": {
      await ensureSheetExists();
      const leads = await getAllLeads();
      console.log(`CSV OK. Found ${leads.length} existing leads. File: outreach-agent/leads.csv`);
      break;
    }
    case "sendgrid": {
      validateEnv(["SENDGRID_API_KEY", "SENDER_EMAIL"]);
      const testEmail = opts.to || process.env.SENDER_EMAIL!;
      await sendOutreachEmail({
        to: testEmail,
        businessName: "Test Salon",
        category: "barber",
        message: "Bok,\n\nOvo je testna poruka iz QueueUp outreach agenta.\n\nFran",
      });
      console.log(`SendGrid OK. Test email sent to ${testEmail}`);
      break;
    }
    case "claude": {
      validateEnv(["ANTHROPIC_API_KEY"]);
      const pitch = await generatePitch("Salon Sunce", "barber", "Zagreb");
      console.log("Claude OK. Generated pitch:\n\n" + pitch);
      break;
    }
    default:
      console.error(`Unknown integration: ${integration}. Use: serper|sheets|sendgrid|claude`);
  }
}

// ─── Interactive Mode ─────────────────────────────────────────────────────────

async function runInteractive() {
  console.log("\n🚀 QueueUp Outreach Agent — Interactive Mode\n");

  const categoryInput = await ask("Kategorija (barber/spa/restaurant/fitness/dentist/salon): ");
  const category = categoryInput.trim() as BusinessCategory;

  const citiesInput = await ask("Gradovi (razdvojeni zarezom, npr. Zagreb,Split): ");
  const cities = citiesInput.split(",").map((c) => c.trim()).filter(Boolean);

  const maxLeadsInput = await ask("Maksimalno leadova po pretrazi [10]: ");
  const maxLeads = parseInt(maxLeadsInput) || 10;

  const delayInput = await ask("Pauza između emailova u ms [3000]: ");
  const delay = parseInt(delayInput) || 3000;

  console.log("\n📋 Pregled:");
  console.log(`  Kategorija: ${category}`);
  console.log(`  Gradovi: ${cities.join(", ")}`);
  console.log(`  Max leadova: ${maxLeads}`);
  console.log(`  Pauza: ${delay}ms`);

  const previewFirst = await ask("\nHoćeš li pregledati prvu poruku prije slanja? (da/ne) [da]: ");
  const shouldPreview = previewFirst.toLowerCase() !== "ne";

  if (shouldPreview) {
    console.log("\n[Generiranje preview poruke...]\n");
    const samplePitch = await generatePitch("Vaš Salon", category, cities[0]);
    console.log("Primjer poruke:\n");
    console.log(samplePitch);
    const confirm = await ask("\nZvuči dobro? Nastavi sa slanjem? (da/ne): ");
    if (confirm.toLowerCase() !== "da") {
      console.log("Prekinuto. Prilagodi prompt u src/apis/claude.ts i pokušaj ponovo.");
      process.exit(0);
    }
  }

  const config: CampaignConfig = {
    id: `interactive-${Date.now()}`,
    category,
    cities,
    maxLeads,
    delayBetweenEmails: delay,
  };

  validateEnv(["SERPER_API_KEY", "ANTHROPIC_API_KEY", "SENDGRID_API_KEY", "SENDER_EMAIL"]);
  const report = await processCampaign(config, isDryRun);

  console.log("\n✅ Kampanja završena!");
  console.log(`  Pretraživanja: ${report.searchesPerformed}`);
  console.log(`  Leadova pronađeno: ${report.leadsFound}`);
  console.log(`  Emailova pronađeno: ${report.emailsExtracted}`);
  console.log(`  Emailova poslano: ${report.emailsSent}`);
  console.log(`  Grešaka: ${report.emailsFailed}`);

  // CSV export
  const leads = await getAllLeads();
  const csvFile = exportLeadsToCsv(leads);
  console.log(`\n📊 CSV export: ${csvFile}`);
}

// ─── Batch Mode ───────────────────────────────────────────────────────────────

async function runBatch(configPath: string) {
  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }

  const { campaigns } = JSON.parse(fs.readFileSync(configPath, "utf-8")) as { campaigns: CampaignConfig[] };
  validateEnv(["SERPER_API_KEY", "ANTHROPIC_API_KEY", "SENDGRID_API_KEY", "SENDER_EMAIL"]);

  logger.info(`Starting batch with ${campaigns.length} campaigns`);

  for (const campaign of campaigns) {
    logger.info(`Starting campaign: ${campaign.id}`);
    await processCampaign(campaign, isDryRun);
    await sleep(5000);
  }

  logger.info("All campaigns complete");
}

// ─── Entry Point ──────────────────────────────────────────────────────────────

async function main() {
  // Test mode
  if (opts.test) {
    await runTest(opts.test as string);
    return;
  }

  // Follow-up mode
  if (opts.followup) {
    validateEnv(["SENDGRID_API_KEY", "SENDER_EMAIL"]);
    const days = parseInt(opts.days as string) as 3 | 7;
    await runFollowUp(days, isDryRun);
    return;
  }

  // Batch mode
  if (opts.batch) {
    await runBatch(opts.config as string);
    return;
  }

  // Quick run with CLI flags
  if (opts.category && opts.cities) {
    validateEnv(["SERPER_API_KEY", "ANTHROPIC_API_KEY"]);
    if (!isDryRun) validateEnv(["SENDGRID_API_KEY", "SENDER_EMAIL"]);

    const config: CampaignConfig = {
      id: `quick-${Date.now()}`,
      category: opts.category as BusinessCategory,
      cities: (opts.cities as string).split(",").map((c: string) => c.trim()),
      maxLeads: parseInt(opts.maxLeads as string) || 10,
      delayBetweenEmails: 3000,
    };
    await processCampaign(config, isDryRun);
    return;
  }

  // Interactive mode (default)
  await runInteractive();
}

main().catch((err) => {
  logger.error(`Fatal error: ${err}`);
  process.exit(1);
});
