# Environment Variables

## Main App (Vercel)
| Variable | Where | Purpose |
|----------|-------|---------|
| `DATABASE_URL` | Vercel env vars | PostgreSQL connection string (Neon) |
| `NEXTAUTH_SECRET` | Vercel env vars | JWT signing secret |
| `SENDGRID_API_KEY` | Vercel env vars | Email sending |
| `CRON_SECRET` | Vercel env vars | Protects cron endpoints from unauthorized calls |
| `GOOGLE_CLIENT_ID` | Vercel env vars | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | Vercel env vars | Google OAuth |
| `NEXTAUTH_URL` | Vercel env vars | Production URL (https://www.queueup.me) |

## Outreach Agent (local .env)
| Variable | Where | Purpose |
|----------|-------|---------|
| `SERPER_API_KEY` | outreach-agent/.env | Business search API |
| `ANTHROPIC_API_KEY` | outreach-agent/.env | Claude pitch generation |
| `SENDGRID_API_KEY` | outreach-agent/.env | Outreach email sending |
| `SENDER_EMAIL` | outreach-agent/.env | From address (info@queueup.me) |
| `SENDER_NAME` | outreach-agent/.env | Display name (Fran) |

## Where to Get Keys
- **Anthropic:** console.anthropic.com → API Keys
- **SendGrid:** app.sendgrid.com → Settings → API Keys
- **Serper:** serper.dev → Dashboard
- **Neon DB:** console.neon.tech → Connection Details

## Key Rotation
Last rotated: 2026-03-24
- Never commit `.env` files to git
- Old keys in git history are invalidated (deleted from dashboards)

## Links
- [[Security]]
- [[Outreach Agent]]
