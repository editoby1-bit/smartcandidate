// app/api/recipients/route.ts
// PRIVACY PROTECTED:
// - admin: sees counts + full data
// - analyst / field_coordinator / social_manager: counts and geo stats ONLY
// - Phone numbers NEVER returned to non-admin roles

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users').select('candidate_id, role').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const isAdmin = userRow.role === 'admin'
  const { searchParams } = new URL(req.url)
  const state     = searchParams.get('state')
  const lga       = searchParams.get('lga')
  const ward      = searchParams.get('ward')
  const language  = searchParams.get('language')
  const group     = searchParams.get('group')
  const countOnly = searchParams.get('count') === 'true'
  const page      = parseInt(searchParams.get('page') ?? '1')
  const limit     = Math.min(parseInt(searchParams.get('limit') ?? '50'), 100)

  // Count query — available to all roles
  let countQ = db.from('recipients')
    .select('id', { count: 'exact', head: true })
    .eq('candidate_id', userRow.candidate_id)
    .eq('opted_out', false)

  if (state)    countQ = countQ.eq('state', state)
  if (lga)      countQ = countQ.eq('lga', lga)
  if (ward)     countQ = countQ.eq('ward', ward)
  if (language) countQ = countQ.eq('language', language)
  if (group)    countQ = countQ.eq('group_tag', group)

  const { count } = await countQ
  if (countOnly) return NextResponse.json({ count: count ?? 0 })

  // Non-admin: geo breakdown only, zero phone numbers
  if (!isAdmin) {
    const { data: geoData } = await db.from('recipients')
      .select('state, lga, ward')
      .eq('candidate_id', userRow.candidate_id)
      .eq('opted_out', false)

    const lgaMap   = new Map<string, number>()
    const stateMap = new Map<string, number>()
    for (const r of geoData ?? []) {
      if (r.lga)   lgaMap.set(r.lga,    (lgaMap.get(r.lga)    ?? 0) + 1)
      if (r.state) stateMap.set(r.state, (stateMap.get(r.state) ?? 0) + 1)
    }

    return NextResponse.json({
      count: count ?? 0,
      byState: Array.from(stateMap.entries()).map(([state, count]) => ({ state, count })).sort((a,b) => b.count - a.count),
      byLGA:   Array.from(lgaMap.entries()).map(([lga, count]) => ({ lga, count })).sort((a,b) => b.count - a.count),
      protected: true,
      message: 'Phone numbers are not visible. Use geo targeting in Broadcast to reach these voters.',
    })
  }

  // Admin only — full data including phone numbers
  let q = db.from('recipients')
    .select('id, phone, name, state, lga, ward, language, group_tag, opted_out, created_at')
    .eq('candidate_id', userRow.candidate_id)
    .eq('opted_out', false)
    .order('created_at', { ascending: false })
    .range((page-1)*limit, page*limit-1)

  if (state)    q = q.eq('state', state)
  if (lga)      q = q.eq('lga', lga)
  if (ward)     q = q.eq('ward', ward)
  if (language) q = q.eq('language', language)
  if (group)    q = q.eq('group_tag', group)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [], count: count ?? 0, page, limit })
}
