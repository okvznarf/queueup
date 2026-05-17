# Outreach Agent

B2B outreach tool for contacting Croatian auto repair shops (mechanics, body shops, tire shops). Primary ICP for QueueUp v2.

> **Why mechanics over barbers/spas/restaurants:** higher cost per missed call (€300–€2,000 vs €30–€50), higher willingness to pay (€80–€150/mo vs €25–€40), less locked into incumbent scheduling software (Booksy dominates barbers; mechanics use a mix of Shopmonkey / spreadsheets / nothing).

**Location:** `outreach-agent/`

## How It Works
1. **Search** — Serper API finds businesses by category + city
2. **Extract** — Scrapes contact emails from business websites
3. **Generate** — Claude API writes personalized Croatian pitch
4. **Deduplicate** — Checks CSV to avoid contacting same business twice
5. **Send** — SendGrid delivers the email with QR code to demo booking page
6. **Track** — Updates local CSV with send status

## Running It
```powershell
cd C:\Users\zovko\queueup\outreach-agent

# Dry run (preview without sending)
npx tsx src/agent.ts --dry-run --category mechanic --cities Zagreb

# Send to specific email (test)
npx tsx src/agent.ts --test --to your@email.com

# Batch mode — primary ICP
npx tsx src/agent.ts --batch --category mechanic --cities "Zagreb,Split,Rijeka,Osijek,Zadar"

# Adjacent categories (test if barber/mechanic logic generalizes)
npx tsx src/agent.ts --batch --category "auto-servis,vulkanizer,autolimar" --cities "Zagreb,Split"

# Follow-up emails (day 3, day 7)
npx tsx src/agent.ts --follow-up
```

> Serper search queries should use Croatian terms (`auto servis`, `mehaničar`, `vulkanizer`, `autolimar`) for higher hit rate than English `mechanic`.

## Pitch Style
- Language: Croatian
- Tone: direct, no emojis, no dashes (--)
- Strategy: hit the **missed-call** problem with concrete numbers (1 missed brake job or clutch = 300–800 EUR walked to the competitor; AI receptionist answers in 1 ring while you're under the lift), then offer QueueUp
- Anchor pain: shops lose calls when (a) under a car, (b) on the other line, (c) after-hours, (d) lunch break. AI catches all four.
- Don't lead with "AI" — lead with "your phone never goes to voicemail again"
- Greeting: just "Bok," — never include business name
- Loads `pitch-ideas.txt` if present for extra context

## Environment Variables
```
SERPER_API_KEY=...       # serper.dev
ANTHROPIC_API_KEY=...    # console.anthropic.com
SENDGRID_API_KEY=...     # app.sendgrid.com
SENDER_EMAIL=info@queueup.me
SENDER_NAME=Fran
```

## Email Contents
- Personalized pitch message
- QR code linking to https://queueup.me/booking/demo-mechanic *(create this demo shop before launching mechanic outreach; currently demo-barber is the only live demo)*
- Clickable link below QR code
- Unsubscribe link
- Category-specific subject lines in Croatian (e.g. *"Koliko poziva ste propustili ovaj tjedan?"* — "How many calls did you miss this week?")

## Data Storage
- Leads tracked in `outreach-agent/leads.csv`
- Logs in `outreach-agent/logs/`
- No Google Sheets dependency

## Security Notes
- API keys in `.env` (gitignored — never commit)
- Keys were rotated on 2026-03-24
- Claude output is HTML-escaped before embedding in email
- SendGrid sender verified: info@queueup.me
- Start small (3-5/day) to protect domain reputation

## Follow-Up Schedule
- Day 0: Initial pitch
- Day 3: First follow-up
- Day 7: Second follow-up

## Links
- [[Security]]
- [[QueueUp Overview]]
