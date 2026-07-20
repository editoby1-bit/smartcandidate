// app/api/recipients/bulk-paste/route.ts
// Accepts raw pasted numbers — no CSV formatting required
// User selects state/LGA/ward first, numbers filed under that geography

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'
import { normalisePhone } from '@/lib/utils/geography'

export async function POST(req: NextRequest) {
  const db    = createServerSupabase()
  const svcDb = createServiceSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users').select('candidate_id, role').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const { raw_text, state, lga, ward, language } = body

  if (!raw_text?.trim()) {
    return NextResponse.json({ error: 'No numbers provided' }, { status: 400 })
  }

  // Extract all phone-like sequences from raw text
  // Handles newlines, commas, spaces, dashes, any separator
  const tokens = raw_text
    .replace(/[\n\r,;|]/g, ' ')
    .split(/\s+/)
    .map((t: string) => t.replace(/[^0-9+]/g, ''))
    .filter((t: string) => t.length >= 7)

  const toInsert: any[] = []
  const seen = new Set<string>()
  let invalid = 0

  for (const token of tokens) {
    const phone = normalisePhone(token)
    if (!phone) { invalid++; continue }
    if (seen.has(phone)) continue
    seen.add(phone)
    toInsert.push({
      candidate_id: userRow.candidate_id,
      phone,
      state:    state    || null,
      lga:      lga      || null,
      ward:     ward     || null,
      language: language || 'english',
    })
  }

  let inserted = 0
  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await svcDb.from('recipients')
      .upsert(toInsert.slice(i, i + 500), { onConflict: 'candidate_id,phone', ignoreDuplicates: true })
    if (!error) inserted += Math.min(500, toInsert.length - i)
  }

  return NextResponse.json({
    success: true, found: tokens.length, valid: toInsert.length,
    inserted, invalid, duplicates: toInsert.length - inserted,
    geography: { state: state || 'Unmapped', lga: lga || 'Unmapped', ward: ward || null },
  })
}
