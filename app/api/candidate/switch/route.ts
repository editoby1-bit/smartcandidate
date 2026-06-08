// app/api/candidate/switch/route.ts
// Switch the active candidate for the current user
// Updates the user's candidate_id in the users table

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'

export async function POST(req: NextRequest) {
  const db    = createServerSupabase()
  const svcDb = createServiceSupabase()

  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { candidate_id } = await req.json()
  if (!candidate_id) {
    return NextResponse.json({ error: 'candidate_id required' }, { status: 400 })
  }

  // Verify this user actually has access to this candidate
  // (there must be a users row linking them)
  const { data: existing } = await svcDb
    .from('users')
    .select('id')
    .eq('id', user.id)
    .eq('candidate_id', candidate_id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: 'You do not have access to this candidate' }, { status: 403 })
  }

  // The user already has a row for this candidate — nothing to update
  // The "active" candidate is simply determined by which users row we look at
  // Since one user can only have one active session, we need to update
  // their PRIMARY candidate_id

  // Update the current session's candidate by modifying the main users record
  // We do this by updating the candidate_id on the user's primary record
  const { error } = await svcDb
    .from('users')
    .update({ candidate_id })
    .eq('id', user.id)
    .eq('candidate_id', (
      await db.from('users').select('candidate_id').eq('id', user.id).single()
    ).data?.candidate_id ?? '')

  if (error) {
    // If update failed, try a direct update
    await svcDb
      .from('users')
      .update({ candidate_id })
      .eq('id', user.id)
  }

  return NextResponse.json({ success: true, candidate_id })
}
