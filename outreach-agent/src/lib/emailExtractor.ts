import { load } from "cheerio";
import { extractEmailsFromText, rankEmails } from "./validator.js";
import { logger } from "./logger.js";

const TIMEOUT_MS = 8000;
const CONTACT_PAGE_PATHS = ["/kontakt", "/contact", "/o-nama", "/about", "/info"];

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; QueueUp/1.0; +https://queueup.me)" },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function normalizeUrl(base: string): string {
  try {
    const url = new URL(base);
    return `${url.protocol}//${url.hostname}`;
  } catch {
    if (!base.startsWith("http")) return `https://${base}`;
    return base;
  }
}

export async function extractEmailFromWebsite(websiteUrl: string): Promise<string | null> {
  const base = normalizeUrl(websiteUrl);

  // Try homepage first
  const homepage = await fetchPage(base);
  if (homepage) {
    const $ = load(homepage);
    // Prefer mailto: links
    const mailtoEmails: string[] = [];
    $("a[href^='mailto:']").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const email = href.replace("mailto:", "").split("?")[0].trim();
      if (email) mailtoEmails.push(email);
    });
    if (mailtoEmails.length > 0) {
      const ranked = rankEmails(mailtoEmails);
      logger.debug(`Found mailto on homepage: ${ranked[0]}`);
      return ranked[0];
    }

    // Text scan
    const bodyText = $.text();
    const found = rankEmails(extractEmailsFromText(bodyText));
    if (found.length > 0) {
      logger.debug(`Found email in homepage text: ${found[0]}`);
      return found[0];
    }
  }

  // Try contact pages
  for (const path of CONTACT_PAGE_PATHS) {
    const page = await fetchPage(base + path);
    if (!page) continue;
    const $ = load(page);

    const mailtoEmails: string[] = [];
    $("a[href^='mailto:']").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      const email = href.replace("mailto:", "").split("?")[0].trim();
      if (email) mailtoEmails.push(email);
    });
    if (mailtoEmails.length > 0) {
      const ranked = rankEmails(mailtoEmails);
      return ranked[0];
    }

    const bodyText = $.text();
    const found = rankEmails(extractEmailsFromText(bodyText));
    if (found.length > 0) return found[0];
  }

  logger.debug(`No email found for ${websiteUrl}`);
  return null;
}
