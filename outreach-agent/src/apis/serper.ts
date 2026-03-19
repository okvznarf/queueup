import type { BusinessCategory, SerperResult } from "../types/index.js";
import { logger } from "../lib/logger.js";

const SERPER_URL = "https://google.serper.dev/search";

const CATEGORY_QUERIES: Record<BusinessCategory, string> = {
  barber: "frizerski salon",
  spa: "spa beauty salon",
  restaurant: "restoran rezervacije",
  fitness: "fitness studio teretana",
  dentist: "stomatolog ordinacija",
  salon: "kozmetički salon",
  veterinary: "veterinarska ordinacija",
  other: "mali biznis",
};

export async function searchBusinesses(
  category: BusinessCategory,
  city: string,
  numResults = 10,
): Promise<SerperResult[]> {
  const query = `${CATEGORY_QUERIES[category]} ${city}`;
  logger.info(`Searching Serper: "${query}"`);

  const res = await fetch(SERPER_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, gl: "hr", hl: "hr", num: numResults }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Serper API error ${res.status}: ${err}`);
  }

  const data = await res.json() as { organic?: Array<{ title: string; link: string; snippet: string }> };
  const results = (data.organic ?? []).map((r) => ({
    title: r.title,
    link: r.link,
    snippet: r.snippet ?? "",
  }));

  logger.info(`Found ${results.length} results for "${query}"`);
  return results;
}

export function parseBusinessName(result: SerperResult): string {
  // Strip common suffixes like " - Kontakt", " | Naslovna", etc.
  return result.title
    .replace(/\s*[-|–]\s*.+$/, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .trim();
}
