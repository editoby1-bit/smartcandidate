// app/api/race-tracker/route.ts
// Race Tracker — monitors the election landscape regardless of candidate
// Tracks issues, topics, sentiment on the race itself
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

  // Check if race tracker is activated for this candidate
  const { data: candidate } = await db
    .from('candidates').select('features').eq('id', userRow.candidate_id).single()

  const features = candidate?.features ?? {}
  const activated = features?.race_tracker === true || features?.premium === true

  if (!activated) {
    return NextResponse.json({
      activated: false,
      message: 'Race Tracker is a premium feature. Contact your administrator to activate.',
    })
  }

  // When activated — pull real race tracking data
  // For now returns structure showing what data will appear
  return NextResponse.json({
    activated: true,
    data: {
      topIssues: [],
      voterSentiment: [],
      trendingTopics: [],
      mediaNarrative: [],
    }
  })
}

export async function POST(req: NextRequest) {
  // Activate race tracker for a candidate — admin only
  const db    = createServerSupabase()
  const svcDb = createServiceSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users').select('candidate_id, role').eq('id', user.id).single()
  if (!userRow || userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { candidate_id } = await req.json()

  const { data: candidate } = await svcDb
    .from('candidates').select('features').eq('id', candidate_id ?? userRow.candidate_id).single()

  const features = { ...(candidate?.features ?? {}), race_tracker: true }

  await svcDb.from('candidates')
    .update({ features })
    .eq('id', candidate_id ?? userRow.candidate_id)

  return NextResponse.json({ success: true, message: 'Race Tracker activated' })
}
