// app/api/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { getDashboardStats, getSentimentBreakdown } from '@/lib/analytics/aggregator'

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users').select('candidate_id').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'dashboard'

  switch (type) {
    case 'dashboard':
      return NextResponse.json(await getDashboardStats(userRow.candidate_id))

    case 'sentiment':
      const days = parseInt(searchParams.get('days') ?? '7')
      return NextResponse.json(await getSentimentBreakdown(userRow.candidate_id, days))

    case 'wards':
      const { data: wards } = await db
        .from('ward_snapshots')
        .select('*')
        .order('reach_pct', { ascending: false })
      return NextResponse.json(wards ?? [])

    case 'channels':
      const { data: channels } = await db
        .from('channel_snapshots')
        .select('*')
        .order('snapshot_at', { ascending: false })
        .limit(50)
      return NextResponse.json(channels ?? [])

    default:
      return NextResponse.json({ error: 'Unknown type' }, { status: 400 })
  }
}
