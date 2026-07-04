import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'
import { sendSMSBulk } from '@/lib/messaging/africastalking'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data, error } = await db.from('campaigns').select('*').eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db    = createServerSupabase()
  const svcDb = createServiceSupabase()

  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  const { data: campaign } = await svcDb
    .from('campaigns').select('*').eq('id', params.id).single()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  if (action === 'launch') {
    // Count recipients first
    let countQ = svcDb
      .from('recipients')
      .select('id', { count: 'exact', head: true })
      .eq('candidate_id', campaign.candidate_id)
      .eq('opted_out', false)

    if (campaign.target_state)    countQ = countQ.eq('state',    campaign.target_state)
    if (campaign.target_lga)      countQ = countQ.eq('lga',      campaign.target_lga)
    if (campaign.target_ward)     countQ = countQ.eq('ward',     campaign.target_ward)
    if (campaign.target_language) countQ = countQ.eq('language', campaign.target_language)

    const { count } = await countQ
    if (!count || count === 0) {
      return NextResponse.json({ error: 'No eligible recipients found' }, { status: 400 })
    }

    // Mark running immediately — return fast
    await svcDb.from('campaigns').update({
      status:        'running',
      launched_at:   new Date().toISOString(),
      total_targets: count,
      sent_count:    0,
      failed_count:  0,
    }).eq('id', campaign.id)

    // Process in chunks of 1000 via AT bulk API
    // Each chunk is a separate API call — much faster than one-by-one
    const CHUNK = 1000
    const totalChunks = Math.ceil(count / CHUNK)

    console.log(`[Campaign] ${campaign.id} — ${count} recipients, ${totalChunks} chunks`)

    // Fire chunks asynchronously — don't await
    // This returns the response immediately while sending continues
    processCampaignChunks(campaign, count, CHUNK, svcDb).catch(err => {
      console.error(`[Campaign] ${campaign.id} chunk error:`, err)
    })

    return NextResponse.json({
      success:      true,
      total:        count,
      chunks:       totalChunks,
      message:      `Campaign launched — sending to ${count.toLocaleString()} recipients in ${totalChunks} batch${totalChunks !== 1 ? 'es' : ''}`,
    })
  }

  if (action === 'pause') {
    await svcDb.from('campaigns').update({ status: 'paused' }).eq('id', campaign.id)
    return NextResponse.json({ success: true })
  }

  if (action === 'cancel') {
    await svcDb.from('campaigns').update({ status: 'cancelled' }).eq('id', campaign.id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}

async function processCampaignChunks(
  campaign: any,
  total: number,
  chunkSize: number,
  svcDb: any
) {
  let sent = 0, failed = 0, offset = 0

  while (offset < total) {
    // Check if campaign was paused or cancelled
    const { data: current } = await svcDb
      .from('campaigns').select('status').eq('id', campaign.id).single()
    if (current?.status === 'paused' || current?.status === 'cancelled') {
      console.log(`[Campaign] ${campaign.id} stopped — ${current.status}`)
      return
    }

    // Fetch this chunk
    let q = svcDb
      .from('recipients')
      .select('id, phone, name, lga, ward')
      .eq('candidate_id', campaign.candidate_id)
      .eq('opted_out', false)
      .range(offset, offset + chunkSize - 1)

    if (campaign.target_state)    q = q.eq('state',    campaign.target_state)
    if (campaign.target_lga)      q = q.eq('lga',      campaign.target_lga)
    if (campaign.target_ward)     q = q.eq('ward',     campaign.target_ward)
    if (campaign.target_language) q = q.eq('language', campaign.target_language)

    const { data: recipients } = await q
    if (!recipients?.length) break

    // Build personalised messages
    const messages = recipients.map(r => ({
      phone:   r.phone,
      message: (campaign.message_body || '')
        .replace(/\{name\}/g, r.name  ?? 'Valued Voter')
        .replace(/\{lga\}/g,  r.lga   ?? '')
        .replace(/\{ward\}/g, r.ward  ?? ''),
      recipientId: r.id,
    }))

    // Send entire chunk as one AT bulk call
    const result = await sendSMSBulk(
      messages.map(m => m.phone),
      messages[0].message, // same message for chunk (personalisation handled above)
      messages,            // individual messages with personalisation
    )

    sent   += result.sent
    failed += result.failed

    // Record sends in DB
    if (result.recipients?.length) {
      const sendRecords = result.recipients.map((r: any) => ({
        campaign_id:  campaign.id,
        recipient_id: messages.find(m => m.phone === r.number)?.recipientId ?? null,
        channel:      'sms',
        status:       r.status === 'Success' ? 'sent' : 'failed',
        message_id:   r.messageId ?? null,
        attempted_at: new Date().toISOString(),
      })).filter((r: any) => r.recipient_id)

      if (sendRecords.length) {
        await svcDb.from('sends').insert(sendRecords)
      }
    }

    // Update progress
    await svcDb.from('campaigns')
      .update({ sent_count: sent, failed_count: failed })
      .eq('id', campaign.id)

    console.log(`[Campaign] ${campaign.id} — chunk ${Math.floor(offset/chunkSize)+1} done: ${sent} sent, ${failed} failed`)

    offset += chunkSize

    // Small delay between chunks to avoid rate limiting
    await new Promise(res => setTimeout(res, 500))
  }

  // Final status
  await svcDb.from('campaigns').update({
    status:       sent > 0 ? 'completed' : 'failed',
    sent_count:   sent,
    failed_count: failed,
    completed_at: new Date().toISOString(),
  }).eq('id', campaign.id)

  console.log(`[Campaign] ${campaign.id} COMPLETE — ${sent} sent, ${failed} failed out of ${total}`)
}
