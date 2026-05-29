// app/api/campaigns/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'
import { enqueueCampaign } from '@/lib/messaging/queues'

// GET /api/campaigns/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await db
    .from('campaigns')
    .select('*')
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/campaigns/[id] — update status (launch, pause, cancel)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = createServerSupabase()
  const svcDb = createServiceSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body // 'launch' | 'pause' | 'cancel'

  const { data: campaign } = await db
    .from('campaigns')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  if (action === 'launch') {
    if (!['draft', 'scheduled', 'paused'].includes(campaign.status)) {
      return NextResponse.json({ error: 'Campaign cannot be launched in current status' }, { status: 400 })
    }

    // Fetch all matching recipients
    let query = svcDb
      .from('recipients')
      .select('id, phone, name, lga, ward')
      .eq('candidate_id', campaign.candidate_id)
      .eq('opted_out', false)

    if (campaign.target_state)    query = query.eq('state', campaign.target_state)
    if (campaign.target_lga)      query = query.eq('lga', campaign.target_lga)
    if (campaign.target_ward)     query = query.eq('ward', campaign.target_ward)
    if (campaign.target_language) query = query.eq('language', campaign.target_language)
    if (campaign.target_group)    query = query.eq('group_tag', campaign.target_group)

    const { data: recipients } = await query
    if (!recipients?.length) {
      return NextResponse.json({ error: 'No eligible recipients found' }, { status: 400 })
    }

    // Create send rows
    const sends = recipients.map(r => ({
      campaign_id:  campaign.id,
      recipient_id: r.id,
      state:        (r as any).state ?? null,
      lga:          r.lga ?? null,
      ward:         r.ward ?? null,
      status:       'queued',
    }))

    // Insert in batches of 1000
    for (let i = 0; i < sends.length; i += 1000) {
      await svcDb.from('sends').insert(sends.slice(i, i + 1000))
    }

    // Get inserted sends with phone numbers (join recipients)
    const { data: sendRows } = await svcDb
      .from('sends')
      .select('id, recipient_id, recipients!inner(phone, name, lga, ward)')
      .eq('campaign_id', campaign.id)
      .eq('status', 'queued')

    if (sendRows?.length) {
      const forQueue = sendRows.map(s => ({
        id:           s.id,
        recipient_id: s.recipient_id,
        phone:        (s as any).recipients.phone,
        name:         (s as any).recipients.name,
        lga:          (s as any).recipients.lga,
        ward:         (s as any).recipients.ward,
      }))

      await enqueueCampaign(campaign, forQueue)
    }

    // Update campaign status
    await svcDb.from('campaigns').update({
      status:           'running',
      launched_at:      new Date().toISOString(),
      total_targets:    recipients.length,
      estimated_finish: new Date(Date.now() + recipients.length * 100).toISOString(), // rough estimate
    }).eq('id', campaign.id)

    // Audit log
    await svcDb.from('audit_log').insert({
      candidate_id: campaign.candidate_id,
      user_id:      user.id,
      action:       'campaign.launch',
      entity_type:  'campaign',
      entity_id:    campaign.id,
      detail:       { recipients: recipients.length, channel: campaign.channel },
    })

    return NextResponse.json({ success: true, queued: recipients.length })
  }

  if (action === 'pause') {
    await svcDb.from('campaigns').update({ status: 'paused' }).eq('id', campaign.id)
    return NextResponse.json({ success: true })
  }

  if (action === 'cancel') {
    await svcDb.from('campaigns').update({ status: 'failed' }).eq('id', campaign.id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
