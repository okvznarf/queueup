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

const SYSTEM_PROMPT = `Ti si Fran, prijateljska i znatiželjna osoba koja se obraća vlasnicima malih poduzeća u Hrvatskoj.
Tvoj cilj je POKRENUTI RAZGOVOR o njihovom poslovanju, a ne im nešto prodati.

Pišeš kratkim, toplim rečenicama na razgovornom hrvatskom. Bez korporativnog tona.
Postavljaš pitanja. Znatiželjni si.
Fokusiraš se na njihove izazove, ne na tvoj produkt.

Pravila:
- Kratke, udarljive rečenice (max 5-8 ukupno u poruci)
- Emoji koristi rijetko (max 1-2)
- Oslovljavaj ih imenom salona/firme
- Nikakve značajke softvera, tehničke detalje, niti naziv platforme
- Jedno otvoreno pitanje na kraju
- Razgovorni ton, kao da pišeš kolegi, ne klijentu
- NIKAD ne spominji booking sustav, software, aplikaciju ni rješenje`;

const CATEGORY_HINTS: Record<BusinessCategory, string> = {
  barber: "Pitaj o otkazivanjima u zadnji čas, no-showovima ili kako organiziraju raspored.",
  spa: "Pitaj o vršnim i sporim terminima, ili kako upravljaju zakazivanjem tretmana.",
  restaurant: "Pitaj o rezervacijama, koliko ih je dnevno i kako ih prate.",
  fitness: "Pitaj o grupnim treninzima i kako upravljaju prijavama.",
  dentist: "Pitaj o organizaciji termina pacijenata i čekaonici.",
  salon: "Pitaj o stalnim klijentima i kako dogovaraju termine.",
  veterinary: "Pitaj o hitnim posjetima i kako organiziraju raspored.",
  other: "Pitaj o organizaciji i izazovima u njihovom svakodnevnom poslovanju.",
};

export async function generatePitch(
  businessName: string,
  category: BusinessCategory,
  city: string,
): Promise<string> {
  const pitchIdeasSection = PITCH_IDEAS
    ? `\nMoje ideje i primjeri tona koje možeš koristiti kao inspiraciju:\n---\n${PITCH_IDEAS}\n---\n`
    : "";

  const userPrompt = `Napiši PRVU poruku (ne pitch) za:
- Naziv: ${businessName}
- Kategorija: ${category}
- Grad: ${city}

Savjet za ovu kategoriju: ${CATEGORY_HINTS[category]}
${pitchIdeasSection}
Poruka mora:
1. Biti kratka (5-8 rečenica max)
2. Pokazati da poznaješ njihovu industriju
3. Sadržavati JEDNO iskreno pitanje na kraju
4. Zvučati ljudski i prirodno
5. Biti potpisana samo s "Fran"

NIKAD ne spominji booking sustav, aplikaciju, software ili rješenje.`;

  logger.info(`Generating pitch for ${businessName} (${category}, ${city})`);

  const stream = await client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 400,
    thinking: { type: "adaptive" },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const message = await stream.finalMessage();
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text in Claude response");
  }

  logger.info(`Generated pitch for ${businessName}`);
  return textBlock.text.trim();
}

export function getFollowUpMessage(day: 3 | 7): string {
  if (day === 3) {
    return `Bok! 👋 Samo da ne ispadne da sam upala i nestala – javite ako vam ikad zatreba pomoć s dogovaranjem termina.\n\nSve najbolje! 😊\n\nFran`;
  }
  return `Vidim da ste aktivni s vašim klijentima – svaka čast na trudu! 💪\n\nMale firme to najteže održavaju. Ako vam ikad zatreba nešto oko logistike termina, slobodno se javite.\n\nFran`;
}
