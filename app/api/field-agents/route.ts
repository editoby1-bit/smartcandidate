// app/api/field-agents/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await db
    .from('field_agents')
    .select('*')
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const db    = createServerSupabase()
  const svcDb = createServiceSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users').select('candidate_id').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  if (!body.name?.trim() || !body.phone?.trim()) {
    return NextResponse.json({ error: 'Name and phone required' }, { status: 400 })
  }

  // Generate unique agent code: AGT-XXX
  const { count } = await svcDb
    .from('field_agents')
    .select('id', { count: 'exact', head: true })
    .eq('candidate_id', userRow.candidate_id)

  const agentCode = `AGT-${String((count ?? 0) + 1).padStart(3, '0')}`

  const { data, error } = await svcDb.from('field_agents').insert({
    candidate_id:   userRow.candidate_id,
    name:           body.name.trim(),
    phone:          body.phone.trim(),
    agent_code:     agentCode,
    assigned_state: body.assigned_state ?? 'Lagos',
    assigned_lga:   body.assigned_lga   ?? null,
    assigned_ward:  body.assigned_ward  ?? null,
    status:         'active',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
