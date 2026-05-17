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

## Voice Service (Railway)
| Variable | Where | Purpose |
|----------|-------|---------|
| `ANTHROPIC_API_KEY` | Railway env vars | Claude brain for voice + chat |
| `DEEPGRAM_API_KEY` | Railway env vars | Speech-to-text (Nova-2) |
| `ELEVENLABS_API_KEY` | Railway env vars | Text-to-speech (eleven_flash_v2_5) |
| `TWILIO_ACCOUNT_SID` | Railway env vars | Twilio telephony |
| `TWILIO_AUTH_TOKEN` | Railway env vars | Twilio signature validation |
| `INTERNAL_SERVICE_TOKEN` | Railway + Vercel | Shared secret — voice-service → QueueUp API auth |
| `QUEUEUP_API_URL` | Railway env vars | Base URL of Next.js app (e.g. https://www.queueup.me) |
| `DATABASE_URL` | Railway env vars | Shared PostgreSQL (VoiceCall, VoiceTranscript, VoiceAuditLog) |
| `UPSTASH_REDIS_REST_URL` | Railway env vars | Idempotency store |
| `UPSTASH_REDIS_REST_TOKEN` | Railway env vars | Idempotency store |

## Where to Get Keys
- **Anthropic:** console.anthropic.com → API Keys
- **SendGrid:** app.sendgrid.com → Settings → API Keys
- **Serper:** serper.dev → Dashboard
- **Neon DB:** console.neon.tech → Connection Details
- **Deepgram:** console.deepgram.com → API Keys
- **ElevenLabs:** elevenlabs.io → Profile → API Keys
- **Twilio:** console.twilio.com → Account Info (SID + Auth Token)

## Key Rotation
Last rotated: 2026-03-24
- Never commit `.env` files to git
- Old keys in git history are invalidated (deleted from dashboards)

## Links
- [[Security]]
- [[Outreach Agent]]
- [[AI Receptionist]]
