import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userRow } = await db.from('users').select('candidate_id').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ files: [] })
  const svcDb = createServiceSupabase()
  const { data } = await svcDb.storage.from('audio').list(userRow.candidate_id, { sortBy: { column: 'created_at', order: 'desc' } })
  const files = (data ?? []).map(f => ({
    name: f.name, size: f.metadata?.size ?? 0, created_at: f.created_at,
    url: svcDb.storage.from('audio').getPublicUrl(`${userRow.candidate_id}/${f.name}`).data.publicUrl,
  }))
  return NextResponse.json({ files })
}

export async function POST(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userRow } = await db.from('users').select('candidate_id').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const label = (formData.get('label') as string) || 'audio'
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Max 10MB' }, { status: 400 })
  const svcDb = createServiceSupabase()
  const ext = file.name.split('.').pop() ?? 'mp3'
  const safeName = `${label.replace(/[^a-zA-Z0-9-_]/g, '_')}_${Date.now()}.${ext}`
  const path = `${userRow.candidate_id}/${safeName}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await svcDb.storage.from('audio').upload(path, buffer, { contentType: file.type || 'audio/mpeg' })
  if (error) return NextResponse.json({ error: error.message.includes('bucket') ? 'Create "audio" bucket in Supabase Storage first (public)' : error.message }, { status: 500 })
  const publicUrl = svcDb.storage.from('audio').getPublicUrl(path).data.publicUrl
  return NextResponse.json({ success: true, url: publicUrl, name: safeName })
}

export async function DELETE(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: userRow } = await db.from('users').select('candidate_id').eq('id', user.id).single()
  if (!userRow) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { filename } = await req.json()
  const svcDb = createServiceSupabase()
  await svcDb.storage.from('audio').remove([`${userRow.candidate_id}/${filename}`])
  return NextResponse.json({ success: true })
}
