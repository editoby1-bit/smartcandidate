// lib/messaging/providers/gateway.ts
// Pluggable WhatsApp gateway provider interface
// Supports Fonnte, WaBlast, WA-Gateway, and any custom operator
//
// These are Nigerian WhatsApp gateway services that run their own SIM farms.
// You send via their REST API. They handle rotation and ban recovery.
// Use as overflow when your own SIM farm hits daily limits,
// or as primary sender for surge capacity near election day.

export interface GatewayResult {
  success: boolean
  messageId?: string
  error?: string
  cost?: number  // in kobo
}

// ── Fonnte (fonnte.com) ───────────────────────────────────────
// Popular in Nigerian market, supports bulk sending
export async function sendViaFonnte(
  to: string,
  message: string,
  options?: { mediaUrl?: string; delay?: number }
): Promise<GatewayResult> {
  const token = process.env.FONNTE_TOKEN
  if (!token) return { success: false, error: 'FONNTE_TOKEN not set' }

  try {
    const body: Record<string, string> = {
      target: to.replace(/[^0-9]/g, ''),
      message,
      ...(options?.delay && { delay: String(options.delay) }),
      ...(options?.mediaUrl && { url: options.mediaUrl }),
    }

    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body),
    })

    const data = await res.json()
    if (data.status === true || data.status === 'true') {
      return { success: true, messageId: data.id ?? data.detail }
    }
    return { success: false, error: data.reason ?? data.message ?? 'Unknown error' }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ── WaBlast (wablast.id / Nigerian resellers) ─────────────────
export async function sendViaWaBlast(
  to: string,
  message: string,
  options?: { mediaUrl?: string }
): Promise<GatewayResult> {
  const apiKey = process.env.WABLAST_API_KEY
  const deviceId = process.env.WABLAST_DEVICE_ID
  if (!apiKey || !deviceId) return { success: false, error: 'WABLAST credentials not set' }

  try {
    const payload: Record<string, string> = {
      api_key: apiKey,
      sender: deviceId,
      number: to.replace(/[^0-9]/g, ''),
      message,
      ...(options?.mediaUrl && { media_url: options.mediaUrl }),
    }

    const res = await fetch('https://wablast.id/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (data.status === 'success' || data.success === true) {
      return { success: true, messageId: data.data?.id ?? data.message_id }
    }
    return { success: false, error: data.message ?? 'Unknown error' }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ── Generic HTTP gateway ───────────────────────────────────────
// For any gateway that accepts a simple POST request
// Configure via environment variables
export async function sendViaCustomGateway(
  to: string,
  message: string
): Promise<GatewayResult> {
  const url    = process.env.WA_GATEWAY_URL
  const apiKey = process.env.WA_GATEWAY_KEY
  const toKey  = process.env.WA_GATEWAY_TO_FIELD    ?? 'phone'
  const msgKey = process.env.WA_GATEWAY_MSG_FIELD   ?? 'message'
  const authHeader = process.env.WA_GATEWAY_AUTH_HEADER ?? 'Authorization'

  if (!url) return { success: false, error: 'WA_GATEWAY_URL not set' }

  try {
    const payload: Record<string, string> = {
      [toKey]:  to.replace(/[^0-9]/g, ''),
      [msgKey]: message,
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { [authHeader]: apiKey }),
      },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { success: true, messageId: data?.id ?? data?.message_id }
    }
    return { success: false, error: `HTTP ${res.status}` }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// ── Provider selector ──────────────────────────────────────────
// Picks gateway based on WA_GATEWAY_PROVIDER env var
export type GatewayProvider = 'fonnte' | 'wablast' | 'custom'

export async function sendViaGateway(
  to: string,
  message: string,
  mediaUrl?: string
): Promise<GatewayResult> {
  const provider = (process.env.WA_GATEWAY_PROVIDER ?? 'fonnte') as GatewayProvider

  switch (provider) {
    case 'fonnte':  return sendViaFonnte(to, message, { mediaUrl })
    case 'wablast': return sendViaWaBlast(to, message, { mediaUrl })
    case 'custom':  return sendViaCustomGateway(to, message)
    default:        return { success: false, error: `Unknown gateway provider: ${provider}` }
  }
}
