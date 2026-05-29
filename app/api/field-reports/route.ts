// app/api/field-reports/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const severity = searchParams.get('severity')
  const status   = searchParams.get('status') ?? 'open'
  const lga      = searchParams.get('lga')

  let query = db
    .from('field_reports')
    .select('*, field_agents(name, phone, assigned_ward)')
    .order('created_at', { ascending: false })
    .limit(100)

  if (severity) query = query.eq('severity', severity)
  if (status)   query = query.eq('status', status)
  if (lga)      query = query.eq('lga', lga)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()

  const { data, error } = await db.from('field_reports').insert({
    ...body,
    status: 'open',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
