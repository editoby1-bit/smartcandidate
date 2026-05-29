import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: poll } = await db.from('polls').select('*').eq('id', params.id).single()
  if (!poll) return NextResponse.json({ error: 'Poll not found' }, { status: 404 })

  const { data: responses } = await db
    .from('poll_responses')
    .select('selected_key, lga, ward')
    .eq('poll_id', params.id)

  const total = responses?.length ?? 0
  const options = ((poll as any).options as any[]).map((opt: any) => {
    const count = responses?.filter(r => r.selected_key === opt.key).length ?? 0
    return { key: opt.key, label: opt.label, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }
  })

  return NextResponse.json({ poll, totalResponses: total, options, byLGA: [] })
}
