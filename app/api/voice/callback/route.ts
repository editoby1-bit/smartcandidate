// app/api/voice/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/db/supabase'
import { buildVoiceXML } from '@/lib/messaging/africastalking'
import { getSentimentQueue } from '@/lib/messaging/queues'
import { normalisePhone } from '@/lib/utils/geography'

export async function POST(req: NextRequest) {
  const db = createServiceSupabase()
  const body = Object.fromEntries(await req.formData() as any) as Record<string, string>

  const phone       = normalisePhone(body.callerNumber ?? body.phoneNumber ?? '') ?? ''
  const dtmfDigits  = body.dtmfDigits ?? ''
  const callStatus  = body.callStatus ?? body.status ?? ''
  const isTerminal  = ['Completed','NoAnswer','Busy','Failed','Expired'].includes(callStatus)

  // Find recipient
  const { data: recipient } = await db
    .from('recipients')
    .select('id, candidate_id, state, lga, ward, language')
    .eq('phone', phone)
    .single()

  // Find the send record for this call
  const { data: send } = await db
    .from('sends')
    .select('id, campaign_id')
    .eq('recipient_id', recipient?.id ?? '')
    .order('attempted_at', { ascending: false })
    .limit(1)
    .single()

  if (isTerminal && send) {
    const status = callStatus === 'Completed' ? 'delivered' : 'failed'
    await db.from('sends').update({
      status,
      ...(status === 'delivered' && { delivered_at: new Date().toISOString() }),
      error_code: callStatus !== 'Completed' ? callStatus : null,
    }).eq('id', send.id)

    if (status === 'delivered') {
      await db.rpc('increment_campaign_delivered', { campaign_id_arg: send.campaign_id })
    }
  }

  // If DTMF digits received, record as a response
  if (dtmfDigits && recipient) {
    const { data: response } = await db.from('responses').insert({
      candidate_id:  recipient.candidate_id,
      recipient_id:  recipient.id,
      campaign_id:   send?.campaign_id ?? null,
      state:         recipient.state,
      lga:           recipient.lga,
      ward:          recipient.ward,
      channel:       'voice',
      dtmf_key:      dtmfDigits,
      response_text: `DTMF:${dtmfDigits}`,
      received_at:   new Date().toISOString(),
    }).select('id').single()

    if (response) {
      const sentimentQueue = getSentimentQueue()
      await sentimentQueue.add('score', {
        response_id:  response.id,
        candidate_id: recipient.candidate_id,
        text:         dtmfDigits,
        channel:      'voice',
      })
    }

    // Respond based on key pressed
    const lang = recipient.language ?? 'english'
    const messages: Record<string, Record<string, string>> = {
      '1': {
        english: 'Thank you for your support. Your vote means everything to Lagos.',
        yoruba:  'E se fun atilẹyin rẹ. Ibo rẹ ni ohun gbogbo fun Lagos.',
        pidgin:  'Thank you for your support. Your vote go count for Lagos.',
      },
      '2': {
        english: 'For more information about Governor Adeyemi, visit our website or reply with your question.',
        yoruba:  'Fun alaye síi nipa Gómìnà Adeyemi, ẹ wọlé si oju opo wẹẹbu wa.',
        pidgin:  'For more info about Governor Adeyemi, check our website.',
      },
      '3': {
        english: 'Thank you. A campaign volunteer will contact you shortly about a community meeting.',
        yoruba:  'E se. Olùranlọwọ ìpolongo yoo kan sí yín nípa ìpàdé àwùjọ.',
        pidgin:  'Thank you. One campaign volunteer go call you soon for community meeting.',
      },
    }

    const responseMsg = messages[dtmfDigits]?.[lang] ?? messages[dtmfDigits]?.['english'] ?? 'Thank you. Goodbye.'

    return new NextResponse(
      buildVoiceXML({ message: responseMsg }),
      { headers: { 'Content-Type': 'application/xml' } }
    )
  }

  // Default: just acknowledge
  return new NextResponse(
    buildVoiceXML({ message: 'Thank you. Goodbye.' }),
    { headers: { 'Content-Type': 'application/xml' } }
  )
}
