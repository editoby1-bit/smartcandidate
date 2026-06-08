import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'
import { normalisePhone } from '@/lib/utils/geography'

function normLang(lang: string): string {
  const l = (lang ?? '').toLowerCase()
  if (l.includes('yoruba')) return 'yoruba'
  if (l.includes('hausa'))  return 'hausa'
  if (l.includes('igbo'))   return 'igbo'
  if (l.includes('pidgin')) return 'pidgin'
  return 'english'
}

export async function POST(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userRow } = await db.from('users').select('candidate_id, role').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  const text = await file.text()
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return NextResponse.json({ error: 'File empty' }, { status: 400 })
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
  const pi = headers.findIndex(h => h.includes('phone') || h.includes('mobile') || h.includes('number'))
  if (pi === -1) return NextResponse.json({ error: 'No phone column found' }, { status: 400 })
  const ni = headers.findIndex(h => h === 'name')
  const si = headers.findIndex(h => h === 'state')
  const li = headers.findIndex(h => h === 'lga')
  const wi = headers.findIndex(h => h === 'ward')
  const lgi = headers.findIndex(h => h.includes('lang'))
  const gi = headers.findIndex(h => h === 'group' || h === 'group_tag')
  const rows: any[] = []
  const seen = new Set<string>()
  let invalid = 0
  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(',').map(x => x.trim().replace(/"/g, ''))
    const phone = normalisePhone(c[pi] ?? '')
    if (!phone) { invalid++; continue }
    if (seen.has(phone)) continue
    seen.add(phone)
    rows.push({ candidate_id: userRow.candidate_id, phone, name: ni >= 0 ? (c[ni] || null) : null, state: si >= 0 ? (c[si] || null) : null, lga: li >= 0 ? (c[li] || null) : null, ward: wi >= 0 ? (c[wi] || null) : null, language: normLang(lgi >= 0 ? c[lgi] : ''), group_tag: gi >= 0 ? (c[gi] || null) : null })
  }
  const svcDb = createServiceSupabase()
  let inserted = 0
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await svcDb.from('recipients').upsert(rows.slice(i, i + 500), { onConflict: 'candidate_id,phone', ignoreDuplicates: true })
    if (!error) inserted += Math.min(500, rows.length - i)
  }
  return NextResponse.json({ success: true, total: lines.length - 1, inserted, invalid })
}
