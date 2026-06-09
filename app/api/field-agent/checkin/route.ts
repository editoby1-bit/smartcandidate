// app/api/field-agent/checkin/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/db/supabase'

export async function POST(req: NextRequest) {
  const { agent_id } = await req.json()
  if (!agent_id) return NextResponse.json({ error: 'agent_id required' }, { status: 400 })

  const db = createServiceSupabase()
  await db
    .from('field_agents')
    .update({ last_checkin_at: new Date().toISOString() })
    .eq('id', agent_id)

  return NextResponse.json({ success: true, checkin_at: new Date().toISOString() })
}
