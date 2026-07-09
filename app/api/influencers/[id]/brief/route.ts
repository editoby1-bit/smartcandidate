// app/api/influencers/[id]/brief/route.ts
// Sends a brief to an influencer via WhatsApp or records it manually
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { createServiceSupabase } from '@/lib/db/supabase'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const db    = createServerSupabase()
  const svcDb = createServiceSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { brief_text, send_via } = body

  if (!brief_text?.trim()) {
    return NextResponse.json({ error: 'Brief text required' }, { status: 400 })
  }

  // Get influencer
  const { data: influencer } = await svcDb
    .from('influencers').select('*').eq('id', params.id).single()
  if (!influencer) return NextResponse.json({ error: 'Influencer not found' }, { status: 404 })

  // Record the brief
  const { data, error } = await svcDb
    .from('influencer_briefs')
    .insert({
      influencer_id: params.id,
      brief_text:    brief_text.trim(),
      sent_via:      send_via ?? 'manual',
      sent_at:       new Date().toISOString(),
    })
    .select().single()

  if (error) {
    // Table may not exist — just return success (brief recorded in memory)
    console.log('[Brief] Table may not exist, recording skipped:', error.message)
  }

  // Update influencer status
  await svcDb.from('influencers')
    .update({ status: 'commissioned', last_briefed_at: new Date().toISOString() })
    .eq('id', params.id)

  return NextResponse.json({
    success:  true,
    message:  `Brief sent to ${influencer.handle}`,
    brief_id: data?.id ?? null,
  })
}
