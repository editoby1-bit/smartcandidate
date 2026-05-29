// app/api/recipients/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const state    = searchParams.get('state')
  const lga      = searchParams.get('lga')
  const ward     = searchParams.get('ward')
  const language = searchParams.get('language')
  const group    = searchParams.get('group')
  const countOnly = searchParams.get('count') === 'true'
  const page     = parseInt(searchParams.get('page') ?? '1')
  const limit    = parseInt(searchParams.get('limit') ?? '50')

  let query = db
    .from('recipients')
    .select(countOnly ? 'id' : '*', { count: 'exact', head: countOnly })
    .eq('opted_out', false)

  if (state)    query = query.eq('state', state)
  if (lga)      query = query.eq('lga', lga)
  if (ward)     query = query.eq('ward', ward)
  if (language) query = query.eq('language', language)
  if (group)    query = query.eq('group_tag', group)

  if (!countOnly) {
    query = query
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)
  }

  const { data, count, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data: data ?? [], count: count ?? 0, page, limit })
}
