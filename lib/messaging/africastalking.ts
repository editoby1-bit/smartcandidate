// lib/messaging/africastalking.ts
import { normalisePhone } from '@/lib/utils/geography'

const AT_BASE  = 'https://api.sandbox.africastalking.com/version1'
const AT_VOICE = 'https://voice.africastalking.com'
const AT_WA    = 'https://chat.africastalking.com/whatsapp'

// Headers built fresh on every call — ensures env vars are always read
function getHeaders() {
  return {
    'apiKey':       process.env.AT_API_KEY!,
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept':       'application/json',
  }
}

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
      to:       phone,
      message,
      ...(senderId && { from: senderId }),
    })

    console.log('[AT SMS] Sending to:', phone, 'username:', process.env.AT_USERNAME, 'apiKey set:', !!process.env.AT_API_KEY)

    const res = await fetch(`${AT_BASE}/messaging`, {
      method:  'POST',
      headers: getHeaders(),
      body,
    })

    const text = await res.text()
    console.log('[AT SMS] Raw response:', text.substring(0, 200))

    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return { phone, messageId: null, status: 'failed', error: `AT returned non-JSON: ${text.substring(0, 100)}` }
    }

    const recipient = data?.SMSMessageData?.Recipients?.[0]
    if (!recipient || recipient.status !== 'Success') {
      return { phone, messageId: null, status: 'failed', error: recipient?.status ?? JSON.stringify(data) }
    }
    return { phone, messageId: recipient.messageId, status: 'success' }

  } catch (err) {
    return { phone, messageId: null, status: 'failed', error: String(err) }
  }
}

export async function sendVoiceCall(to: string, callbackUrl?: string) {
  const phone = normalisePhone(to)
  if (!phone) return { success: false, error: 'Invalid phone' }

  try {
    const body = new URLSearchParams({
      username: process.env.AT_USERNAME!,
      to:       phone,
      from:     process.env.AT_CALLER_ID ?? '',
    })
    const res  = await fetch(`${AT_VOICE}/call`, { method: 'POST', headers: getHeaders(), body })
    const data = await res.json()
    return { success: true, data }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}


// Parse delivery receipt from AT webhook callback
export function parseDeliveryReceipt(body: Record<string, string>) {
  return {
    messageId: body.id ?? body.messageId ?? null,
    phone:     body.phoneNumber ?? body.to ?? null,
    status:    body.status ?? 'Unknown',
    failureReason: body.failureReason ?? null,
    networkCode:   body.networkCode ?? null,
    retryCount:    body.retryCount ? parseInt(body.retryCount) : 0,
  }
}

// Parse inbound SMS from AT webhook
export function parseInboundSMS(body: Record<string, string>) {
  return {
    messageId: body.id ?? null,
    phone:     body.from ?? null,
    text:      body.text ?? '',
    date:      body.date ?? new Date().toISOString(),
    network:   body.networkCode ?? null,
  }
}

export async function sendSMSBulk(
  phones: string[],
  defaultMessage: string,
  individualMessages?: { phone: string; message: string; recipientId?: string }[]
): Promise<{ sent: number; failed: number; recipients: any[] }> {
  try {
    const allSame = !individualMessages ||
      individualMessages.every(m => m.message === defaultMessage)

    if (allSame) {
      const body = new URLSearchParams({
        username: process.env.AT_USERNAME!,
        to:       phones.join(','),
        message:  defaultMessage,
      })
      const res  = await fetch(`${AT_BASE}/messaging`, { method: 'POST', headers: getHeaders(), body })
      const text = await res.text()
      console.log(`[AT BULK] ${phones.length} numbers — response: ${text.substring(0, 200)}`)
      let data: any
      try { data = JSON.parse(text) } catch {
        return { sent: 0, failed: phones.length, recipients: [] }
      }
      const recipients = data?.SMSMessageData?.Recipients ?? []
      return {
        sent:       recipients.filter((r: any) => r.status === 'Success').length,
        failed:     recipients.filter((r: any) => r.status !== 'Success').length,
        recipients,
      }
    } else {
      const CONCURRENCY = 20
      const allRecipients: any[] = []
      let sent = 0, failed = 0
      for (let i = 0; i < (individualMessages?.length ?? 0); i += CONCURRENCY) {
        const batch = (individualMessages ?? []).slice(i, i + CONCURRENCY)
        const results = await Promise.all(batch.map(m => sendSMS(m.phone, m.message)))
        for (const r of results) {
          if (r.status === 'success') sent++
          else failed++
          allRecipients.push({ number: r.phone, status: r.status === 'success' ? 'Success' : 'Failed', messageId: r.messageId })
        }
      }
      return { sent, failed, recipients: allRecipients }
    }
  } catch (err) {
    console.error('[AT BULK] Error:', err)
    return { sent: 0, failed: phones.length, recipients: [] }
  }
}

// Bulk SMS — sends to multiple numbers in one API call
// AT supports comma-separated numbers, up to 1000 per call
