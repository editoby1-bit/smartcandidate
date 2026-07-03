// lib/messaging/africastalking.ts
import { normalisePhone } from '@/lib/utils/geography'

const AT_BASE  = 'https://api.africastalking.com/version1'
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

