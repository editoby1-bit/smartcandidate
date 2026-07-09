// app/api/influencers/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users').select('candidate_id').eq('id', user.id).single()
  if (!userRow) return NextResponse.json([], { status: 200 })

  const { data, error } = await db
    .from('influencers')
    .select('*')
    .eq('candidate_id', userRow.candidate_id)
    .order('created_at', { ascending: false })

  if (error) {
    // Table may not exist yet — return empty array gracefully
    console.log('[Influencers] Table may not exist:', error.message)
    return NextResponse.json([])
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const db    = createServerSupabase()
  const svcDb = createServiceSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users').select('candidate_id, role').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  if (!body.handle?.trim()) {
    return NextResponse.json({ error: 'Handle is required' }, { status: 400 })
  }

  const { data, error } = await svcDb
    .from('influencers')
    .insert({
      candidate_id:   userRow.candidate_id,
      handle:         body.handle.trim(),
      platform:       body.platform       ?? 'instagram',
      full_name:      body.full_name      ?? null,
      followers:      body.followers      ?? null,
      contact:        body.contact        ?? null,
      rate_per_post:  body.rate_per_post  ?? null,
      niche:          body.niche          ?? null,
      notes:          body.notes          ?? null,
      status:         body.status         ?? 'unengaged',
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
