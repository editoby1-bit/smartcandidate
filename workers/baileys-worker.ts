// workers/baileys-worker.ts
// The main WhatsApp worker using Baileys multi-session pool
//
// Run: npm run worker:baileys
// Manages: session pool, warming scheduler, send queue, inbound reply handler
//
// SETUP:
// 1. Add BAILEYS_SESSION_COUNT=10 (or however many SIMs you have) to .env
// 2. Run this worker: npm run worker:baileys
// 3. It will print QR codes for each new session — scan with WhatsApp
// 4. Once scanned, sessions are saved and reconnect automatically
// 5. Scale up by increasing BAILEYS_SESSION_COUNT and scanning more SIMs

import { Worker, Queue } from 'bullmq'
import IORedis from 'ioredis'
import { createServiceSupabase } from '@/lib/db/supabase'
import {
  getSessionDir,
  getDailyLimit,
  createBaileysSession,
  sendViaSocket,
  type WASession,
} from '@/lib/messaging/providers/baileys-pool'
import { sendViaGateway } from '@/lib/messaging/providers/gateway'
import { getSentimentQueue, QUEUE_NAMES, type SendJobData } from '@/lib/messaging/queues'
import { normalisePhone } from '@/lib/utils/geography'
import QRCode from 'qrcode-terminal'

// ── Config ────────────────────────────────────────────────────
const SESSION_COUNT  = parseInt(process.env.BAILEYS_SESSION_COUNT ?? '5')
const SEND_DELAY_MS  = parseInt(process.env.BAILEYS_SEND_DELAY_MS ?? '3000') // 3s between sends per session
const USE_GATEWAY_OVERFLOW = process.env.WA_GATEWAY_PROVIDER !== undefined

const redis = new IORedis(process.env.REDIS_URL!, { maxRetriesPerRequest: null })
const db    = createServiceSupabase()

// ── Active socket pool ────────────────────────────────────────
const sockets = new Map<string, any>()         // sessionId → Baileys socket
const sessionLimits = new Map<string, number>() // sessionId → today's sent count

// ── Session management ─────────────────────────────────────────
async function initSessions() {
  console.log(`[Baileys] Initialising ${SESSION_COUNT} sessions...`)

  for (let i = 0; i < SESSION_COUNT; i++) {
    const sessionId = `session_${String(i).padStart(3, '0')}`
    await initSingleSession(sessionId)
    // Stagger startup to avoid rate limits
    await new Promise(r => setTimeout(r, 2000))
  }

  console.log(`[Baileys] ${sockets.size} sessions active`)
}

async function initSingleSession(sessionId: string) {
  const sessionDir = getSessionDir(sessionId)

  try {
    const sock = await createBaileysSession(
      sessionId,
      sessionDir,

      // QR code received — print to terminal for scanning
      (qr) => {
        console.log(`\n[Baileys] QR for ${sessionId} — scan with WhatsApp:`)
        QRCode.generate(qr, { small: true })
        console.log(`[Baileys] Waiting for ${sessionId} to be scanned...`)
      },

      // Connected
      async (phoneNumber) => {
        console.log(`[Baileys] ✓ ${sessionId} connected — ${phoneNumber}`)
        sockets.set(sessionId, sock)
        sessionLimits.set(sessionId, 0)

        // Update sender record in DB
        await db.from('senders').upsert({
          label:        sessionId,
          channel:      'whatsapp',
          phone_number: phoneNumber,
          status:       'active',
          sent_today:   0,
          daily_limit:  getDailyLimit(await getWarmupDay(sessionId)),
        }, { onConflict: 'label' }).eq('candidate_id', db)
      },

      // Disconnected / banned
      async (reason) => {
        console.log(`[Baileys] ✗ ${sessionId} ${reason}`)
        sockets.delete(sessionId)

        if (reason === 'banned') {
          console.log(`[Baileys] ${sessionId} BANNED — marking in DB`)
          await db.from('senders').update({ status: 'banned' }).eq('label', sessionId)
        } else {
          // Attempt reconnect after 30s
          setTimeout(() => initSingleSession(sessionId), 30_000)
        }
      },

      // Inbound message from voter
      async (from, text) => {
        await handleInbound(from, text, 'whatsapp')
      }
    )
  } catch (err) {
    console.error(`[Baileys] Failed to init ${sessionId}:`, err)
  }
}

async function getWarmupDay(sessionId: string): Promise<number> {
  const { data } = await db
    .from('senders')
    .select('created_at')
    .eq('label', sessionId)
    .single()

  if (!data) return 0
  const daysSince = Math.floor((Date.now() - new Date(data.created_at).getTime()) / 86400000)
  return Math.min(daysSince, 14)
}

// ── Inbound handler ───────────────────────────────────────────
async function handleInbound(from: string, text: string, channel: string) {
  const phone = normalisePhone(from) ?? from

  const { data: recipient } = await db
    .from('recipients')
    .select('id, candidate_id, state, lga, ward')
    .eq('phone', phone)
    .single()

  if (!recipient) {
    console.log(`[Baileys Inbound] Unknown: ${phone}`)
    return
  }

  const { data: lastSend } = await db
    .from('sends')
    .select('campaign_id')
    .eq('recipient_id', recipient.id)
    .order('attempted_at', { ascending: false })
    .limit(1)
    .single()

  const { data: response } = await db.from('responses').insert({
    candidate_id:  recipient.candidate_id,
    recipient_id:  recipient.id,
    campaign_id:   lastSend?.campaign_id ?? null,
    state:         recipient.state,
    lga:           recipient.lga,
    ward:          recipient.ward,
    channel,
    response_text: text,
    received_at:   new Date().toISOString(),
  }).select('id').single()

  if (response) {
    const sentimentQ = getSentimentQueue()
    await sentimentQ.add('score', {
      response_id:  response.id,
      candidate_id: recipient.candidate_id,
      text,
      channel,
    })
  }

  console.log(`[Baileys Inbound] ${phone}: "${text.substring(0, 50)}"`)
}

// ── Send worker ───────────────────────────────────────────────
async function processSend(job: { data: SendJobData }) {
  const { send_id, phone, message, campaign_id, media_url } = job.data

  // Find an available session
  const availableSessions = Array.from(sockets.entries()).filter(([sessionId]) => {
    const sent = sessionLimits.get(sessionId) ?? 0
    // Get limit from map or use conservative default
    return sent < getDailyLimit(14) // use max limit as approximation
  })

  if (availableSessions.length === 0 && !USE_GATEWAY_OVERFLOW) {
    // No capacity — requeue for later
    await db.from('sends').update({ status: 'queued' }).eq('id', send_id)
    throw new Error('No WhatsApp sessions available — will retry')
  }

  // Mark as sending
  await db.from('sends').update({
    status: 'sending',
    attempted_at: new Date().toISOString(),
  }).eq('id', send_id)

  let result: { success: boolean; messageId?: string; error?: string }

  if (availableSessions.length > 0) {
    // Use own session pool
    const [sessionId, sock] = availableSessions[0]
    result = await sendViaSocket(sock, phone, message, media_url)

    if (result.success) {
      // Increment session counter
      sessionLimits.set(sessionId, (sessionLimits.get(sessionId) ?? 0) + 1)
    }
  } else {
    // Overflow to gateway
    console.log(`[Baileys] Session pool full — routing ${phone} to gateway`)
    result = await sendViaGateway(phone, message, media_url)
  }

  if (result.success) {
    await db.from('sends').update({
      status:     'sent',
      message_id: result.messageId ?? null,
    }).eq('id', send_id)

    await db.rpc('increment_campaign_sent', { campaign_id_arg: campaign_id })
    console.log(`[Baileys] ✓ ${phone}`)
  } else {
    await db.from('sends').update({
      status:        'failed',
      error_message: result.error,
    }).eq('id', send_id)

    await db.rpc('increment_campaign_failed', { campaign_id_arg: campaign_id })
    console.log(`[Baileys] ✗ ${phone} — ${result.error}`)
    throw new Error(result.error)
  }
}

// ── Warming scheduler ──────────────────────────────────────────
// Runs at midnight, updates daily limits for each session
async function runWarmingScheduler() {
  console.log('[Baileys] Running warming scheduler...')

  for (const [sessionId] of sockets) {
    const warmupDay = await getWarmupDay(sessionId)
    const limit     = getDailyLimit(warmupDay)

    await db.from('senders').update({
      daily_limit: limit,
      sent_today:  0,       // reset daily counter
      reset_at:    new Date().toISOString(),
    }).eq('label', sessionId)

    sessionLimits.set(sessionId, 0)
    console.log(`[Baileys] ${sessionId}: day ${warmupDay}, limit ${limit}/day`)
  }
}

// Reset counters at midnight
function scheduleMidnightReset() {
  const now   = new Date()
  const next  = new Date(now)
  next.setDate(next.getDate() + 1)
  next.setHours(0, 1, 0, 0) // 12:01am
  const msUntil = next.getTime() - now.getTime()

  setTimeout(() => {
    runWarmingScheduler()
    scheduleMidnightReset()
  }, msUntil)

  console.log(`[Baileys] Midnight reset scheduled in ${Math.round(msUntil / 3600000)}h`)
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log('[Baileys Worker] Starting...')
  console.log(`[Baileys Worker] Sessions: ${SESSION_COUNT}`)
  console.log(`[Baileys Worker] Send delay: ${SEND_DELAY_MS}ms`)
  console.log(`[Baileys Worker] Gateway overflow: ${USE_GATEWAY_OVERFLOW ? 'ON' : 'OFF'}`)

  // Init all sessions
  await initSessions()

  // Schedule warming resets
  scheduleMidnightReset()

  // Start processing the WhatsApp send queue
  const worker = new Worker<SendJobData>(
    QUEUE_NAMES.WHATSAPP,
    processSend,
    {
      connection: redis,
      concurrency: Math.max(sockets.size, 1),
      limiter: {
        max: SEND_DELAY_MS > 0 ? Math.floor(60000 / SEND_DELAY_MS) : 20,
        duration: 60_000,
      },
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[Baileys] Job failed: ${job?.id} — ${err.message}`)
  })

  console.log('[Baileys Worker] Ready — processing queue')
}

main().catch(err => {
  console.error('[Baileys Worker] Fatal error:', err)
  process.exit(1)
})

process.on('SIGTERM', async () => {
  console.log('[Baileys Worker] Shutting down...')
  for (const [, sock] of sockets) {
    try { await sock.logout() } catch {}
  }
  process.exit(0)
})
