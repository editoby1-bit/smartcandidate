// app/api/campaigns/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'
import { enqueueCampaign } from '@/lib/messaging/queues'
import type { CreateCampaignInput } from '@/types'

// GET /api/campaigns — list campaigns for current user's candidate
export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  let query = db
    .from('campaigns')
    .select('*')
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/campaigns — create a new campaign
export async function POST(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: CreateCampaignInput = await req.json()

  // Get candidate_id from user record
  const { data: userRow } = await db.from('users').select('candidate_id, role').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Count matching recipients (for estimated reach preview)
  let recipientQuery = db
    .from('recipients')
    .select('id, phone, name, lga, ward', { count: 'exact' })
    .eq('candidate_id', userRow.candidate_id)
    .eq('opted_out', false)

  if (body.target_state)    recipientQuery = recipientQuery.eq('state', body.target_state)
  if (body.target_lga)      recipientQuery = recipientQuery.eq('lga', body.target_lga)
  if (body.target_ward)     recipientQuery = recipientQuery.eq('ward', body.target_ward)
  if (body.target_language) recipientQuery = recipientQuery.eq('language', body.target_language)
  if (body.target_group)    recipientQuery = recipientQuery.eq('group_tag', body.target_group)

  const { data: recipients, count } = await recipientQuery

  // Create campaign
  const { data: campaign, error } = await db.from('campaigns').insert({
    candidate_id:     userRow.candidate_id,
    name:             body.name,
    channel:          body.channel,
    template_id:      body.template_id ?? null,
    message_body:     body.message_body,
    language:         body.language,
    target_state:     body.target_state ?? null,
    target_lga:       body.target_lga ?? null,
    target_ward:      body.target_ward ?? null,
    target_language:  body.target_language ?? null,
    target_group:     body.target_group ?? null,
    total_targets:    count ?? 0,
    status:           body.scheduled_at ? 'scheduled' : 'draft',
    scheduled_at:     body.scheduled_at ?? null,
    created_by:       user.id,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ campaign, estimatedReach: count ?? 0 }, { status: 201 })
}
