// lib/messaging/africastalking.ts
// Africa's Talking API client
// Docs: https://developers.africastalking.com

import { normalisePhone } from '@/lib/utils/geography'

const AT_BASE = 'https://api.africastalking.com/version1'
const AT_VOICE = 'https://voice.africastalking.com'
const AT_WA = 'https://chat.africastalking.com/whatsapp'

const HEADERS = {
  'apiKey': process.env.AT_API_KEY!,
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept': 'application/json',
}

// ── SMS ───────────────────────────────────────────────────────

export interface SMSSendResult {
  phone: string
  messageId: string | null
  status: 'success' | 'failed'
  error?: string
}

export async function sendSMS(
  to: string,
  message: string,
  senderId?: string
): Promise<SMSSendResult> {
  const phone = normalisePhone(to)
  if (!phone) return { phone: to, messageId: null, status: 'failed', error: 'Invalid phone' }

  try {
    const body = new URLSearchParams({
      username: process.env.AT_USERNAME!,
      to: phone,
      message,
      ...(senderId && { from: senderId }),
    })

    const res = await fetch(`${AT_BASE}/messaging`, {
      method: 'POST',
      headers: HEADERS,
      body,
    })

    const data = await res.json()
    const recipient = data?.SMSMessageData?.Recipients?.[0]

    if (!recipient || recipient.status !== 'Success') {
      return { phone, messageId: null, status: 'failed', error: recipient?.status ?? 'Unknown error' }
    }

    return { phone, messageId: recipient.messageId, status: 'success' }
  } catch (err) {
    return { phone, messageId: null, status: 'failed', error: String(err) }
  }
}

// ── WhatsApp ─────────────────────────────────────────────────

export interface WAMessageResult {
  phone: string
  messageId: string | null
  status: 'success' | 'failed'
  error?: string
}

export async function sendWhatsApp(
  to: string,
  message: string,
  mediaUrl?: string
): Promise<WAMessageResult> {
  const phone = normalisePhone(to)
  if (!phone) return { phone: to, messageId: null, status: 'failed', error: 'Invalid phone' }

  try {
    const payload: Record<string, string> = {
      username: process.env.AT_USERNAME!,
      productId: process.env.AT_WA_PRODUCT_ID ?? 'default',
      channel: 'whatsapp',
      to: phone,
      message,
    }
    if (mediaUrl) payload.mediaUrl = mediaUrl

    const res = await fetch(`${AT_WA}/message`, {
      method: 'POST',
      headers: { ...HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()

    if (!res.ok || data.status === 'error') {
      return { phone, messageId: null, status: 'failed', error: data.message ?? 'API error' }
    }

    return { phone, messageId: data.messageId ?? data.id, status: 'success' }
  } catch (err) {
    return { phone, messageId: null, status: 'failed', error: String(err) }
  }
}

// ── Voice ─────────────────────────────────────────────────────

export interface VoiceCallResult {
  phone: string
  callId: string | null
  status: 'success' | 'failed'
  error?: string
}

export async function makeVoiceCall(
  to: string,
  callbackUrl: string
): Promise<VoiceCallResult> {
  const phone = normalisePhone(to)
  if (!phone) return { phone: to, callId: null, status: 'failed', error: 'Invalid phone' }

  try {
    const body = new URLSearchParams({
      username: process.env.AT_USERNAME!,
      to: phone,
      from: process.env.AT_VOICE_FROM ?? '+2341xxxxxxxxx',
      callbackUrl,
    })

    const res = await fetch(`${AT_VOICE}/call`, {
      method: 'POST',
      headers: HEADERS,
      body,
    })

    const data = await res.json()
    const entry = data?.entries?.[0]

    if (!entry || entry.status !== 'Queued') {
      return { phone, callId: null, status: 'failed', error: entry?.errorMessage ?? 'Failed to queue' }
    }

    return { phone, callId: entry.callSessionState, status: 'success' }
  } catch (err) {
    return { phone, callId: null, status: 'failed', error: String(err) }
  }
}

// ── Variable substitution ─────────────────────────────────────

export function resolveTemplate(
  template: string,
  vars: Record<string, string | null>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '')
}

// ── Delivery webhook handler ───────────────────────────────────
// Parse AT's delivery receipt POST body

export interface DeliveryReceipt {
  messageId: string
  status: 'Success' | 'Failed' | 'Sent' | string
  phoneNumber: string
  failureReason?: string
  networkCode?: string
  retryCount?: string
}

export function parseDeliveryReceipt(body: Record<string, string>): DeliveryReceipt {
  return {
    messageId: body.id ?? body.messageId,
    status: body.status ?? body.deliveryStatus,
    phoneNumber: body.phoneNumber ?? body.to,
    failureReason: body.failureReason,
    networkCode: body.networkCode,
    retryCount: body.retryCount,
  }
}

// ── Incoming message handler ───────────────────────────────────

export interface IncomingMessage {
  phone: string
  text: string
  channel: 'sms' | 'whatsapp'
  messageId?: string
}

export function parseIncomingSMS(body: Record<string, string>): IncomingMessage {
  return {
    phone: normalisePhone(body.from ?? body.phoneNumber) ?? body.from,
    text: (body.text ?? body.message ?? '').trim(),
    channel: 'sms',
    messageId: body.id,
  }
}

export function parseIncomingWhatsApp(body: Record<string, unknown>): IncomingMessage {
  const from = String((body as any)?.from ?? '')
  const text = String((body as any)?.message?.text?.body ?? (body as any)?.text ?? '')
  return {
    phone: normalisePhone(from) ?? from,
    text: text.trim(),
    channel: 'whatsapp',
    messageId: String((body as any)?.id ?? ''),
  }
}

// ── Voice TwiML-style response ────────────────────────────────
// AT Voice uses XML response to control what happens on a call

export function buildVoiceXML(options: {
  message: string
  gatherDtmf?: boolean
  numDigits?: number
  callbackUrl?: string
  language?: string
}): string {
  const lang = options.language === 'yoruba' ? 'yo-NG' :
               options.language === 'hausa'  ? 'ha-NG' :
               options.language === 'igbo'   ? 'ig-NG' : 'en-NG'

  const gather = options.gatherDtmf && options.callbackUrl
    ? `<GetDigits timeout="30" numDigits="${options.numDigits ?? 1}" callbackUrl="${options.callbackUrl}">
        <Say voice="woman" playBeep="false">${options.message}</Say>
      </GetDigits>`
    : `<Say voice="woman">${options.message}</Say>`

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${gather}
</Response>`
}
