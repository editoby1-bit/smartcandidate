// app/api/opposition/route.ts
// Competitive Intelligence — tracks opponents and landscape
// Premium feature — requires activation

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users').select('candidate_id').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: candidate } = await db
    .from('candidates').select('features').eq('id', userRow.candidate_id).single()

  const features = candidate?.features ?? {}
  const activated = features?.competitive_intelligence === true || features?.premium === true

  if (!activated) {
    return NextResponse.json({ activated: false })
  }

  // Pull opposition tracking data
  const { data: opponents } = await db
    .from('opposition_targets')
    .select('*')
    .eq('candidate_id', userRow.candidate_id)
    .order('created_at')

  return NextResponse.json({ activated: true, opponents: opponents ?? [] })
}

export async function POST(req: NextRequest) {
  const db    = createServerSupabase()
  const svcDb = createServiceSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users').select('candidate_id, role').eq('id', user.id).single()
  if (!userRow || userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()

  // Activate feature
  if (body.action === 'activate') {
    const { data: candidate } = await svcDb
      .from('candidates').select('features').eq('id', userRow.candidate_id).single()
    const features = { ...(candidate?.features ?? {}), competitive_intelligence: true }
    await svcDb.from('candidates').update({ features }).eq('id', userRow.candidate_id)
    return NextResponse.json({ success: true, message: 'Competitive Intelligence activated' })
  }

  // Add an opponent to track
  if (body.name) {
    const { data, error } = await svcDb
      .from('opposition_targets')
      .insert({
        candidate_id: userRow.candidate_id,
        name:         body.name,
        party:        body.party    ?? null,
        handles:      body.handles  ?? {},
        notes:        body.notes    ?? null,
      })
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
}
