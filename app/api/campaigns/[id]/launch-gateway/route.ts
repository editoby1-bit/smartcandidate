import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'
import { sendViaGateway } from '@/lib/messaging/providers/gateway'

const BATCH = 10
const DELAY = 300

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db    = createServerSupabase()
  const svcDb = createServiceSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: campaign } = await db
    .from('campaigns').select('*').eq('id', params.id).single()
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (!process.env.FONNTE_TOKEN && !process.env.WA_GATEWAY_URL && !process.env.WABLAST_API_KEY) {
    return NextResponse.json({
      error: 'No gateway configured. Add FONNTE_TOKEN to your environment variables to activate sending.',
      setup_required: true
    }, { status: 503 })
  }

  let query = svcDb
    .from('recipients')
    .select('id, phone, name, lga, ward')
    .eq('candidate_id', campaign.candidate_id)
    .eq('opted_out', false)

  if (campaign.target_state)    query = query.eq('state',    campaign.target_state)
  if (campaign.target_lga)      query = query.eq('lga',      campaign.target_lga)
  if (campaign.target_ward)     query = query.eq('ward',     campaign.target_ward)
  if (campaign.target_language) query = query.eq('language', campaign.target_language)

  const { data: recipients, count } = await query.select('id, phone, name, lga, ward', { count: 'exact' })
  if (!recipients?.length) return NextResponse.json({ error: 'No eligible recipients found' }, { status: 400 })

  await svcDb.from('campaigns').update({
    status:        'running',
    launched_at:   new Date().toISOString(),
    total_targets: count ?? recipients.length,
  }).eq('id', campaign.id)

  // Send in background — response returns immediately
  ;(async () => {
    let sent = 0, failed = 0

    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH)

      await Promise.all(batch.map(async r => {
        const message = campaign.message_body
          .replace(/\{name\}/g,           r.name  ?? 'Valued Voter')
          .replace(/\{lga\}/g,            r.lga   ?? '')
          .replace(/\{ward\}/g,           r.ward  ?? '')
          .replace(/\{candidate_name\}/g, 'Our Candidate')

        try {
          const result = await sendViaGateway(r.phone, message)
          if (result.success) {
            sent++
            await svcDb.from('sends').insert({
              campaign_id:  campaign.id,
              recipient_id: r.id,
              status:       'sent',
              message_id:   result.messageId ?? null,
              attempted_at: new Date().toISOString(),
            })
          } else {
            failed++
          }
        } catch {
          failed++
        }
      }))

      // Update progress every 50 batches (500 messages)
      if (i % 500 === 0 && i > 0) {
        await svcDb.from('campaigns').update({
          sent_count:   sent,
          failed_count: failed,
        }).eq('id', campaign.id)
      }

      await new Promise(res => setTimeout(res, DELAY))
    }

    // Final update
    await svcDb.from('campaigns').update({
      status:       sent > 0 ? 'completed' : 'failed',
      sent_count:   sent,
      failed_count: failed,
      completed_at: new Date().toISOString(),
    }).eq('id', campaign.id)
  })()

  return NextResponse.json({
    success:  true,
    queued:   recipients.length,
    message:  `Campaign launched — sending to ${recipients.length.toLocaleString()} recipients via gateway`,
  })
}
