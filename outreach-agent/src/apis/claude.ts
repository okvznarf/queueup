import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { BusinessCategory } from "../types/index.js";
import { logger } from "../lib/logger.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load pitch ideas document if it exists (TXT or PDF supported)
// Place your file at outreach-agent/pitch-ideas.txt or pitch-ideas.pdf
function loadPitchIdeas(): string | null {
  const txtPath = path.join(__dirname, "../../pitch-ideas.txt");
  const pdfPath = path.join(__dirname, "../../pitch-ideas.pdf");

  if (fs.existsSync(txtPath)) {
    logger.info("Loaded pitch-ideas.txt");
    return fs.readFileSync(txtPath, "utf-8");
  }
  if (fs.existsSync(pdfPath)) {
    logger.info("Found pitch-ideas.pdf — use pitch-ideas.txt for best results");
    return null; // PDF needs Files API, txt is simpler
  }
  return null;
}

const PITCH_IDEAS = loadPitchIdeas();

const SYSTEM_PROMPT = `Ti si Fran koji radi na QueueUp-u, online sustavu za naručivanje termina.
Pišeš vlasnicima malih poduzeća u Hrvatskoj.

Tvoj pristup:
1. Odmah udari na problem — koliko ljudi ne dođe na termin, koliko love se gubi
2. Stavi konkretan broj (npr. "3-5 ljudi tjedno = 100-200 EUR izgubljeno")
3. Reci da većina to prihvaća kao normalno, ali ne bi trebali
4. Ponudi QueueUp kao rješenje — direktno, bez obilaženja

Ton:
- Direktan, konkretan, bez filozofiranja
- Kratke rečenice, razgovorni hrvatski
- NIKAD ne koristi emojije
- NIKAD ne koristi crtice (--)
- Budi uvjerljiv ali ne napadan
- Potpiši se samo s "Fran" ili "Lp, Fran"

QueueUp rješava to automatski:
- Online booking 24/7
- Email podsjetnici (nema više "zaboravio sam")
- Manje praznih slotova = više love po danu
- Setup traje 10 minuta, mi sve postavimo

Primjer dobrog maila:
"""
Bok,

kratko pitanje — koliko ti ljudi ne dođe na termin tjedno?

Ako je to samo 3-5 ljudi, to je već 100-200 EUR izgubljeno svaki tjedan.

Većina to prihvaća kao "normalno". Ne bi trebali.

QueueUp rješava to automatski:
- online booking 24/7
- email podsjetnici (nema više "e brate zaboravio sam")
- manje praznih slotova, više love po danu

Setup traje 10 minuta i mi ti sve postavimo.

Ako želiš vidjeti kako izgleda u praksi, mogu ti pokazati u 2 minute, bez obaveze.

Lp,
Fran
"""

Piši poruke u ovom stilu. Prilagodi za svaku kategoriju (barber, spa, restoran, itd.) ali zadrži istu energiju i strukturu.`;

const CATEGORY_HINTS: Record<BusinessCategory, string> = {
  barber: "Fokus na no-showove. Klijenti zakažu i ne dođu. Prazan stolac = izgubljena lova. 3-5 no-showova tjedno = 100-200 EUR.",
  spa: "Fokus na propuštene tretmane. Termin od 60-90 min prazan = velika izgubljena zarada. Klijenti zaborave ili otkažu kasno.",
  restaurant: "Fokus na prazne stolove. Rezerviraju stol za 4 i ne dođu. Vikend rezervacije koje propadnu = izgubljena večer.",
  fitness: "Fokus na grupne treninge. Ljudi se prijave i ne dođu. Trener čeka, oprema spremna, a sala poluprazna.",
  dentist: "Fokus na propuštene termine. Pacijent ne dođe = 30-60 min prazan stolac. To je 50-150 EUR po no-showu.",
  salon: "Fokus na otkazivanja u zadnji čas. Klijentica otkaže 30 min prije. Taj termin više nitko ne popuni.",
  veterinary: "Fokus na organizaciju hitnih i redovnih posjeta. Vlasnici zaborave na kontrole, kaos u čekaonici.",
  other: "Fokus na izgubljeno vrijeme i novac kad klijenti ne dođu ili otkažu kasno.",
};

// Sanitize external input (Serper results) before passing to Claude
// Prevents prompt injection from malicious business names/cities
function sanitizeInput(input: string, maxLen = 100): string {
  return input
    .replace(/[\r\n]/g, " ")          // no newlines (blocks prompt injection)
    .replace(/[<>{}]/g, "")            // no angle brackets or braces
    .substring(0, maxLen)
    .trim();
}

export async function generatePitch(
  businessName: string,
  category: BusinessCategory,
  city: string,
): Promise<string> {
  const safeName = sanitizeInput(businessName);
  const safeCity = sanitizeInput(city, 50);

  const pitchIdeasSection = PITCH_IDEAS
    ? `\nMoje ideje i primjeri tona koje možeš koristiti kao inspiraciju:\n---\n${PITCH_IDEAS}\n---\n`
    : "";

  const userPrompt = `Napiši outreach email za:
- Naziv: ${safeName}
- Kategorija: ${category}
- Grad: ${safeCity}

Kontekst za ovu kategoriju: ${CATEGORY_HINTS[category]}
${pitchIdeasSection}
Poruka mora:
1. Početi samo s "Bok," — NIKAD ne stavljaj ime firme u pozdrav
2. Odmah udariti na problem s konkretnim brojevima (koliko love gube)
3. Reći da to nije normalno
4. Nabrojati što QueueUp rješava (kratki bullet pointovi s crticom -)
5. Završiti s ponudom da pokažeš kako radi, bez obaveze
6. Potpisati s "Lp, Fran" ili samo "Fran"
7. NIKAD emojije, NIKAD crtice (--)
8. Max 10-12 redova teksta`;

  logger.info(`Generating pitch for ${safeName} (${category}, ${safeCity})`);

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in Claude response");
  }

  logger.info(`Generated pitch for ${safeName}`);
  return textBlock.text.trim();
}

export function getFollowUpMessage(day: 3 | 7): string {
  if (day === 3) {
    return `Bok,\n\nsamo kratki follow up na prošli mail.\n\nAko te zanima kako smanjiti no-showove i popuniti prazne termine, mogu ti pokazati u 2 minute.\n\nBez obaveze, bez caka.\n\nFran`;
  }
  return `Bok,\n\nzadnji put se javljam.\n\nAko ikad odlučiš riješiti problem s propuštenim terminima, javi se. Setup traje 10 minuta i mi sve postavimo.\n\nSretno s poslom!\n\nFran`;
}
