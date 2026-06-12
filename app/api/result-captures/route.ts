// app/api/result-captures/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await db
    .from('result_captures')
    .select('*, field_agents(name)')
    .order('submitted_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const svcDb = createServiceSupabase()
  const body  = await req.json()

  if (!body.agent_id || !body.candidate_id || !body.polling_unit) {
    return NextResponse.json({ error: 'agent_id, candidate_id, polling_unit required' }, { status: 400 })
  }

  const { data, error } = await svcDb
    .from('result_captures')
    .upsert({
      candidate_id:     body.candidate_id,
      agent_id:         body.agent_id,
      polling_unit:     body.polling_unit,
      ward:             body.ward             ?? 'Unknown',
      lga:              body.lga              ?? 'Unknown',
      state:            body.state            ?? 'Lagos',
      candidate_votes:  body.candidate_votes  ?? 0,
      opponent_votes:   body.opponent_votes   ?? null,
      void_votes:       body.void_votes       ?? 0,
      total_accredited: body.total_accredited ?? null,
      result_sheet_url: body.result_sheet_url ?? null,
      witness_name:     body.witness_name     ?? null,
      verified:         false,
    }, { onConflict: 'candidate_id,polling_unit' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
