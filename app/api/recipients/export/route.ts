// app/api/recipients/export/route.ts
// ADMIN ONLY — exports phone numbers as CSV
// Non-admin roles receive 403 Forbidden — no exceptions

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db
    .from('users').select('candidate_id, role').eq('id', user.id).single()

  // HARD BLOCK — only admin can export phone numbers
  if (!userRow || userRow.role !== 'admin') {
    return NextResponse.json({
      error: 'Access denied. Phone number export is restricted to administrators only.',
      code:  'EXPORT_FORBIDDEN',
    }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const state = searchParams.get('state')
  const lga   = searchParams.get('lga')
  const ward  = searchParams.get('ward')

  let q = db.from('recipients')
    .select('phone, name, state, lga, ward, language, group_tag')
    .eq('candidate_id', userRow.candidate_id)
    .eq('opted_out', false)

  if (state) q = q.eq('state', state)
  if (lga)   q = q.eq('lga', lga)
  if (ward)  q = q.eq('ward', ward)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Build CSV
  const headers = 'phone,name,state,lga,ward,language,group'
  const rows = (data ?? []).map(r =>
    [r.phone, r.name ?? '', r.state ?? '', r.lga ?? '', r.ward ?? '', r.language, r.group_tag ?? ''].join(',')
  )
  const csv = [headers, ...rows].join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type':        'text/csv',
      'Content-Disposition': `attachment; filename="voters_export_${Date.now()}.csv"`,
    }
  })
}
