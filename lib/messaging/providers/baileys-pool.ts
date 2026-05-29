// lib/messaging/providers/baileys-pool.ts
// Multi-session Baileys WhatsApp sender pool
// Manages 1–500+ WhatsApp sessions, warming, ban detection, and rotation
//
// HOW IT WORKS:
// - Each "session" = one WhatsApp account (one SIM / phone number)
// - Sessions are stored in ./wa-sessions/<sessionId>/ as credential files
// - The pool distributes sends across all active sessions
// - New sessions are "warmed" — start slow, increase 20%/day over 14 days
// - Banned sessions are detected immediately and redistributed
// - Session state persists to disk so reconnects survive restarts

import type { AnyMessageContent } from '@whiskeysockets/baileys'
import { createServiceSupabase } from '@/lib/db/supabase'
import path from 'path'
import fs from 'fs'

// Session state stored in DB and filesystem
export interface WASession {
  id: string
  candidate_id: string
  phone_number: string
  status: 'warming' | 'active' | 'banned' | 'disconnected'
  daily_limit: number
  sent_today: number
  warmup_day: number      // 0–14: day in warming period
  last_active: Date | null
  session_dir: string     // path to credential files
}

export interface SendResult {
  success: boolean
  messageId?: string
  error?: string
  sessionId?: string
}

// ── Session directory ─────────────────────────────────────────
const SESSIONS_DIR = process.env.WA_SESSIONS_DIR ?? path.join(process.cwd(), 'wa-sessions')

export function getSessionDir(sessionId: string): string {
  const dir = path.join(SESSIONS_DIR, sessionId)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

// ── Warming schedule ──────────────────────────────────────────
// Day 0: 50/day, Day 1: 60, Day 2: 72... caps at 250 after ~14 days
export function getDailyLimit(warmupDay: number): number {
  if (warmupDay >= 14) return 250
  return Math.min(Math.floor(50 * Math.pow(1.12, warmupDay)), 250)
}

// ── Session selector ──────────────────────────────────────────
// Picks the best available session for a send
export function selectSession(sessions: WASession[]): WASession | null {
  const available = sessions.filter(s =>
    s.status === 'active' &&
    s.sent_today < s.daily_limit
  )
  if (available.length === 0) return null
  // Round-robin: pick the one with most remaining capacity
  return available.sort((a, b) =>
    (b.daily_limit - b.sent_today) - (a.daily_limit - a.sent_today)
  )[0]
}

// ── Baileys session factory ───────────────────────────────────
// Lazily creates Baileys connections — only loaded when worker starts
// (Baileys is a heavy dependency, not loaded in Next.js)
export async function createBaileysSession(
  sessionId: string,
  sessionDir: string,
  onQR: (qr: string) => void,
  onConnected: (phoneNumber: string) => void,
  onDisconnected: (reason: string) => void,
  onMessage: (from: string, text: string) => void
) {
  // Dynamic import so Next.js build doesn't try to bundle Baileys
  const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeInMemoryStore,
  } = await import('@whiskeysockets/baileys')

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['SmartCandidate', 'Chrome', '120.0.0'],
    connectTimeoutMs: 30_000,
    defaultQueryTimeoutMs: 30_000,
    keepAliveIntervalMs: 25_000,
    // Reduce noise in logs
    logger: { level: 'silent' } as any,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      onQR(qr)
    }
    if (connection === 'open') {
      const phone = sock.user?.id?.split(':')[0] ?? 'unknown'
      onConnected(phone)
    }
    if (connection === 'close') {
      const code = (lastDisconnect?.error as any)?.output?.statusCode
      const isBanned = code === DisconnectReason.loggedOut
      onDisconnected(isBanned ? 'banned' : 'disconnected')
    }
  })

  sock.ev.on('messages.upsert', ({ messages, type }) => {
    if (type !== 'notify') return
    for (const msg of messages) {
      if (msg.key.fromMe) continue
      const from = msg.key.remoteJid ?? ''
      const text =
        msg.message?.conversation ??
        msg.message?.extendedTextMessage?.text ??
        ''
      if (text && from) onMessage(from.replace('@s.whatsapp.net', ''), text)
    }
  })

  return sock
}

// ── Send message via a specific socket ───────────────────────
export async function sendViaSocket(
  sock: any,
  to: string,
  message: string,
  mediaUrl?: string
): Promise<SendResult> {
  try {
    const jid = to.replace(/[^0-9]/g, '') + '@s.whatsapp.net'

    let content: AnyMessageContent
    if (mediaUrl) {
      content = {
        image: { url: mediaUrl },
        caption: message,
      }
    } else {
      content = { text: message }
    }

    const result = await sock.sendMessage(jid, content)
    return {
      success: true,
      messageId: result?.key?.id ?? undefined,
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message ?? String(err),
    }
  }
}
