# SmartCandidate

Ward-level political campaign intelligence platform for Nigerian elections.
Broadcast via WhatsApp (Baileys multi-session), SMS, and Voice.
Analyse voter sentiment in real time. Monitor field agents on election day.

---

## Quick Start (GitHub Codespaces)

1. Upload `smartcandidate-phase2.zip` to your Codespace
2. In the terminal:
```bash
unzip smartcandidate-phase2.zip
mv smartcandidate/* . && mv smartcandidate/.env.example . 2>/dev/null
rm -rf smartcandidate smartcandidate-phase2.zip
npm install
cp .env.example .env.local
```
3. Edit `.env.local` — fill in Supabase, Anthropic, AT, Redis keys
4. Set up the database (see Database Setup below)
5. `npm run dev` — app runs at localhost:3000

---

## Database Setup (Supabase)

1. Go to [supabase.com](https://supabase.com) → create a project
2. Go to **SQL Editor**
3. Paste and run `supabase/migrations/001_initial_schema.sql`
4. Then paste and run `supabase/migrations/002_functions.sql`
5. Then paste and run `supabase/seed/001_seed.sql`
6. Go to **Project Settings → API** → copy your URL, anon key, service role key

---

## Import Your Phone Numbers

```bash
# Your CSV needs at minimum a 'phone' column
# Other useful columns: name, state, lga, ward, language, group
npm run import -- --file=voters.csv \
  --candidate=a0000000-0000-0000-0000-000000000001 \
  --dry-run   # remove --dry-run when ready
```

Accepted phone formats: `08012345678`, `+2348012345678`, `2348012345678`
All formats normalised to `+234XXXXXXXXXX` automatically.

---

## WhatsApp at Scale — Complete Guide

WhatsApp is the primary two-way channel. Here is the full architecture.

### Why Baileys, not the official WhatsApp Business API

| | Baileys (what we use) | Official Meta API |
|---|---|---|
| Cost per message | ~₦0 (SIM data only) | ~₦90 per message |
| 1 million messages | ~₦50K (SIM costs) | ~₦90 million |
| Template approval | None required | 24–72 hrs, can be rejected |
| Political content | No restrictions | May be flagged/rejected |
| Ban risk | Manageable with warming | None |
| Two-way replies | Full support | Full support |

### Session warming — critical to avoid bans

New WhatsApp numbers that suddenly send hundreds of messages get banned.
Warming means starting slow and increasing gradually:

| Day | Daily limit |
|-----|------------|
| 0 | 50 |
| 1 | 56 |
| 3 | 70 |
| 7 | 110 |
| 14+ | 250 (fully warmed) |

**Never skip warming.** A banned number means zero sends from that SIM.

### Capacity planning

| Sessions | Daily capacity | Days to reach 1M |
|----------|---------------|-----------------|
| 50       | 12,500        | 80 days         |
| 200      | 50,000        | 20 days         |
| 500      | 125,000       | 8 days          |
| 1,000    | 250,000       | 4 days          |
| 2,000    | 500,000       | 2 days          |

**Recommendation:** Start building your SIM farm now, before the campaign.
A pool of 500 warmed numbers gives you comfortable capacity for a state-level campaign.

### Gateway overflow for surge capacity

When you need to send millions in 24–48 hours (election week), use a gateway:

- **Fonnte** (fonnte.com) — popular in Nigeria, ~₦5–10/message
- **WaBlast** — similar pricing
- Set `WA_GATEWAY_PROVIDER=fonnte` and `FONNTE_TOKEN=your_token` in `.env.local`
- Gateway automatically handles overflow when your SIM farm is at daily limit

### Setting up WhatsApp sessions

Each session = one WhatsApp account (one SIM card):

```bash
# Set how many sessions you want in .env.local
BAILEYS_SESSION_COUNT=10

# Start the Baileys worker
npm run worker:baileys

# QR codes appear in terminal — one per new session
# Open WhatsApp on your phone:
# Settings → Linked Devices → Link a Device → Scan QR code

# Session activates immediately after scanning
# Go to /dashboard/senders to see session status
```

### Two-way voter communication (the real differentiator)

```
Campaign sends: "Reply 1 to confirm support, 2 for info, 3 for meeting"
         ↓
Voter replies in any language (English, Yoruba, Hausa, Igbo, Pidgin)
         ↓
Baileys receives reply → /api/webhooks/inbound
         ↓
Saved to responses table
         ↓
Claude Haiku scores sentiment + identifies topic
         ↓
Ward dashboard updates: "Alimosho: 74% positive, top issue: infrastructure"
         ↓
Campaign team targets undecided wards with follow-up messages
```

---

## Running Workers

### Development (separate terminals)
```bash
npm run worker:baileys    # WhatsApp — manages session pool
npm run worker:sms        # SMS via Africa's Talking
npm run worker:sentiment  # Sentiment scoring via Claude Haiku
```

### Production (PM2)
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup   # auto-restart on server reboot
pm2 logs      # view all logs
pm2 monit     # live dashboard
```

---

## Webhook Configuration (Africa's Talking)

Configure these URLs in your Africa's Talking dashboard:

| Webhook | URL |
|---------|-----|
| SMS Delivery | `https://your-domain.com/api/webhooks/delivery` |
| SMS Inbound  | `https://your-domain.com/api/webhooks/inbound` |
| Voice Callback | `https://your-domain.com/api/voice/callback` |

For Codespaces development, right-click port 3000 → "Make Public" → copy the URL.

---

## Deployment

### Frontend → Vercel
1. Push to GitHub (private repo)
2. Connect repo to Vercel
3. Add all `.env.local` variables to Vercel environment settings
4. Deploy

### Workers → Railway (or any VPS)
- Create Railway service from same repo
- Set start command: `npx tsx workers/baileys-worker.ts`
- Add environment variables
- Repeat for sms-worker and sentiment-worker

**Important:** The Baileys worker needs persistent storage for session files.
On Railway: add a volume mounted at `/app/wa-sessions`.
On a VPS: sessions are stored at `./wa-sessions` by default.

---

## Architecture

```
app/
  api/
    campaigns/        Create, list, launch, pause
    recipients/       List + count with geo filters  
    analytics/        Dashboard KPIs, sentiment, ward data
    field-reports/    Field agent reports
    polls/            Poll management + results
    wa-sessions/      WhatsApp session management
    webhooks/
      delivery/       AT delivery receipt handler
      inbound/        Inbound SMS/WhatsApp reply handler
    voice/callback/   Voice DTMF handler

workers/
  baileys-worker.ts   WhatsApp multi-session pool + inbound
  sms-worker.ts       SMS via Africa's Talking
  sentiment-worker.ts Response scoring via Claude Haiku

lib/
  messaging/
    providers/
      baileys-pool.ts  Session management, warming, ban detection
      gateway.ts       Fonnte/WaBlast/custom gateway integration
    queues.ts          BullMQ queue definitions
    africastalking.ts  AT SMS + Voice
  sentiment/scorer.ts  Claude Haiku sentiment analysis
  analytics/aggregator.ts  Ward snapshots + KPIs
  utils/geography.ts   Nigeria geo + phone normalisation
  db/
    supabase.ts        Browser client (safe in components)
    supabase-server.ts Server client (API routes + Server Components only)
```

---

## Cost Summary

| Service | Cost |
|---------|------|
| Supabase | Free (up to 500MB) |
| Vercel | Free |
| Upstash Redis | Free (10K commands/day) |
| Railway (workers) | ~$5–10/month |
| Africa's Talking SMS | ₦4–8 per message |
| Africa's Talking Voice | ₦8–15 per call |
| Claude Haiku (sentiment) | ~$3–5 per million responses |
| WhatsApp via Baileys | ~₦0 (SIM data only) |
| WhatsApp via gateway | ₦5–10 per message (optional) |
| SIM cards (one-time) | ₦100–200 each |
