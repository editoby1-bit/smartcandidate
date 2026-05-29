// app/api/webhooks/inbound/route.ts
// Handles inbound SMS and WhatsApp replies from voters
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/db/supabase'
import { parseIncomingSMS, parseIncomingWhatsApp } from '@/lib/messaging/africastalking'
import { getSentimentQueue } from '@/lib/messaging/queues'
import { normalisePhone } from '@/lib/utils/geography'

export async function POST(req: NextRequest) {
  const db = createServiceSupabase()
  const contentType = req.headers.get('content-type') ?? ''

  let message: { phone: string; text: string; channel: 'sms' | 'whatsapp' }

  if (contentType.includes('application/json')) {
    const body = await req.json()
    message = parseIncomingWhatsApp(body)
  } else {
    const body = Object.fromEntries(await req.formData() as any)
    message = parseIncomingSMS(body as Record<string, string>)
  }

  const phone = normalisePhone(message.phone) ?? message.phone

  // Find recipient by phone (across all candidates — phone is globally unique)
  const { data: recipient } = await db
    .from('recipients')
    .select('id, candidate_id, state, lga, ward')
    .eq('phone', phone)
    .single()

  if (!recipient) {
    console.log(`[Inbound] Unknown phone: ${phone}`)
    return NextResponse.json({ ok: true })
  }

  // Find the most recent campaign send for this recipient (to link the response)
  const { data: lastSend } = await db
    .from('sends')
    .select('campaign_id')
    .eq('recipient_id', recipient.id)
    .order('attempted_at', { ascending: false })
    .limit(1)
    .single()

  // Insert response
  const { data: response } = await db.from('responses').insert({
    candidate_id: recipient.candidate_id,
    recipient_id: recipient.id,
    campaign_id:  lastSend?.campaign_id ?? null,
    state:        recipient.state,
    lga:          recipient.lga,
    ward:         recipient.ward,
    channel:      message.channel,
    response_text: message.text,
    received_at:  new Date().toISOString(),
  }).select('id').single()

  if (response) {
    // Increment campaign response count
    if (lastSend?.campaign_id) {
      await db.rpc('increment_campaign_responses', { campaign_id_arg: lastSend.campaign_id })
    }

    // Queue sentiment scoring
    const sentimentQueue = getSentimentQueue()
    await sentimentQueue.add('score', {
      response_id:  response.id,
      candidate_id: recipient.candidate_id,
      text:         message.text,
      channel:      message.channel,
    })
  }

  console.log(`[Inbound] ${phone} → "${message.text.substring(0, 40)}..."`)
  return NextResponse.json({ ok: true })
}
