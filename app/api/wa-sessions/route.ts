// app/api/wa-sessions/route.ts
// WhatsApp session management
// GET  /api/wa-sessions       — list all sessions and their status
// POST /api/wa-sessions       — provision a new session slot
// DELETE /api/wa-sessions/[id] — remove a session

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'
import { getDailyLimit } from '@/lib/messaging/providers/baileys-pool'

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: senders } = await db
    .from('senders')
    .select('*')
    .eq('channel', 'whatsapp')
    .order('created_at')

  // Augment with capacity info
  const augmented = (senders ?? []).map(s => ({
    ...s,
    capacity_used_pct: s.daily_limit > 0
      ? Math.round((s.sent_today / s.daily_limit) * 100) : 0,
    warmup_day: Math.min(
      Math.floor((Date.now() - new Date(s.created_at).getTime()) / 86400000),
      14
    ),
  }))

  const stats = {
    total:        augmented.length,
    active:       augmented.filter(s => s.status === 'active').length,
    banned:       augmented.filter(s => s.status === 'banned').length,
    warming:      augmented.filter(s => s.status === 'warming').length,
    daily_capacity: augmented
      .filter(s => s.status === 'active')
      .reduce((sum, s) => sum + s.daily_limit, 0),
    sent_today:   augmented.reduce((sum, s) => sum + s.sent_today, 0),
  }

  return NextResponse.json({ sessions: augmented, stats })
}

export async function POST(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRow } = await db.from('users').select('candidate_id, role').eq('id', user.id).single()
  if (!userRow || userRow.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const body = await req.json()
  const label = body.label ?? `session_${Date.now()}`

  const { data, error } = await db.from('senders').insert({
    candidate_id: userRow.candidate_id,
    label,
    channel:      'whatsapp',
    status:       'warming',
    daily_limit:  getDailyLimit(0), // starts at 50/day
    sent_today:   0,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    session: data,
    message: `Session ${label} created. Start the Baileys worker to see the QR code for this session.`,
    instructions: [
      '1. Run: npm run worker:baileys',
      '2. A QR code will appear in the terminal for each new session',
      '3. Open WhatsApp on your phone → Settings → Linked Devices → Link a Device',
      '4. Scan the QR code',
      '5. The session activates immediately — starts at 50 messages/day',
      '6. Limit increases 12% each day over 14 days until it reaches 250/day',
    ],
  }, { status: 201 })
}
