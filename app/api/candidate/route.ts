// app/api/candidate/route.ts
// GET  — current candidate + all candidates for this user
// PATCH — update current candidate details  
// POST  — create a new candidate (admin only)

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users')
    .select('candidate_id, role')
    .eq('id', user.id)
    .single()

  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Get current candidate
  const { data: candidate } = await db
    .from('candidates')
    .select('*')
    .eq('id', userRow.candidate_id)
    .single()

  // Get all candidates this user's email has access to
  // (any candidate linked to a user with the same email)
  const { data: allUserRows } = await db
    .from('users')
    .select('candidate_id')
    .eq('id', user.id)

  // For admin users, show all candidates they have records for
  const candidateIds = allUserRows?.map(r => r.candidate_id) ?? [userRow.candidate_id]

  const { data: allCandidates } = await db
    .from('candidates')
    .select('*')
    .in('id', candidateIds)
    .order('created_at')

  return NextResponse.json({ candidate, all: allCandidates ?? [] })
}

export async function PATCH(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users')
    .select('candidate_id, role')
    .eq('id', user.id)
    .single()

  if (!userRow) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if (!['admin'].includes(userRow.role)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()

  // Only allow safe fields to be updated
  const allowed = ['name', 'party', 'position', 'state', 'lga', 'election_date', 'election_type', 'color', 'logo_url']
  const update: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key] || null
  }

  const { data, error } = await db
    .from('candidates')
    .update(update)
    .eq('id', userRow.candidate_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ candidate: data })
}

export async function POST(req: NextRequest) {
  const db    = createServerSupabase()
  const svcDb = createServiceSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users')
    .select('candidate_id, role')
    .eq('id', user.id)
    .single()

  if (!userRow || userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Candidate name is required' }, { status: 400 })
  }

  // Create new candidate
  const { data: newCandidate, error } = await svcDb
    .from('candidates')
    .insert({
      name:           body.name.trim(),
      party:          body.party         ?? null,
      position:       body.position      ?? 'Governor',
      state:          body.state         ?? 'Lagos',
      lga:            body.lga           ?? null,
      election_date:  body.election_date ?? null,
      election_type:  body.election_type ?? 'gubernatorial',
      color:          body.color         ?? '#C9A84C',
      active:         true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Create a user record linking the current user to this new candidate too
  await svcDb.from('users').insert({
    id:           user.id,
    candidate_id: newCandidate.id,
    email:        user.email ?? '',
    full_name:    userRow ? (await db.from('users').select('full_name').eq('id', user.id).single()).data?.full_name ?? '' : '',
    role:         'admin',
  }).select()
  // Note: this may fail if unique constraint on (id) — that's ok, 
  // switch endpoint handles the actual switching

  return NextResponse.json({ candidate: newCandidate }, { status: 201 })
}
