// app/api/field-agent/login/route.ts
// Field agents log in with their agent code (no email/password needed)
import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabase } from '@/lib/db/supabase'

export async function POST(req: NextRequest) {
  const { agent_code } = await req.json()
  if (!agent_code) return NextResponse.json({ error: 'Agent code required' }, { status: 400 })

  const db = createServiceSupabase()
  const { data: agent, error } = await db
    .from('field_agents')
    .select('id, name, agent_code, assigned_ward, assigned_lga, assigned_state, candidate_id, status')
    .eq('agent_code', agent_code.trim().toUpperCase())
    .eq('status', 'active')
    .single()

  if (error || !agent) {
    return NextResponse.json({ error: 'Invalid agent code or agent not active' }, { status: 401 })
  }

  return NextResponse.json({ agent })
}
