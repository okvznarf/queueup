# Outreach Agent

B2B outreach tool for contacting Croatian SMEs (barbers, spas, restaurants, etc.)

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
npx tsx src/agent.ts --dry-run --category barber --cities Zagreb

# Send to specific email (test)
npx tsx src/agent.ts --test --to your@email.com

# Batch mode
npx tsx src/agent.ts --batch --category barber --cities "Zagreb,Split,Rijeka"

# Follow-up emails (day 3, day 7)
npx tsx src/agent.ts --follow-up
```

## Pitch Style
- Language: Croatian
- Tone: direct, no emojis, no dashes (--)
- Strategy: hit the no-show problem with concrete numbers (3-5 no-shows = 100-200 EUR lost weekly), then offer QueueUp
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
- QR code linking to https://queueup.me/booking/demo-barber
- Clickable link below QR code
- Unsubscribe link
- Category-specific subject lines in Croatian

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
