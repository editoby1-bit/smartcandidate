// app/api/notifications/route.ts
// Returns recent alerts for the topbar notification bell
// Draws from: field reports (critical/high), sentiment drops, campaign completions

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/db/supabase-server'

export interface Notification {
  id: string
  type: 'field_alert' | 'campaign_complete' | 'sentiment_drop' | 'opt_out_spike'
  title: string
  body: string
  severity: 'critical' | 'high' | 'medium' | 'info'
  created_at: string
  href: string
}

export async function GET(req: NextRequest) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return NextResponse.json({ notifications: [], count: 0 })

  const notifications: Notification[] = []

  // 1. Critical & high field reports in last 24 hours
  const since24h = new Date(Date.now() - 86400000).toISOString()
  const { data: reports } = await db
    .from('field_reports')
    .select('id, report_type, severity, description, lga, ward, created_at')
    .eq('status', 'open')
    .in('severity', ['critical', 'high'])
    .gte('created_at', since24h)
    .order('created_at', { ascending: false })
    .limit(5)

  for (const r of reports ?? []) {
    notifications.push({
      id:         `report-${r.id}`,
      type:       'field_alert',
      title:      `${r.severity === 'critical' ? '🚨' : '⚠️'} ${r.report_type.replace(/_/g, ' ')}`,
      body:       `${r.lga} · ${r.ward} — ${r.description.substring(0, 80)}`,
      severity:   r.severity as 'critical' | 'high',
      created_at: r.created_at,
      href:       '/dashboard/monitor',
    })
  }

  // 2. Recently completed campaigns
  const { data: campaigns } = await db
    .from('campaigns')
    .select('id, name, sent_count, channel, completed_at')
    .eq('status', 'completed')
    .gte('completed_at', since24h)
    .order('completed_at', { ascending: false })
    .limit(3)

  for (const c of campaigns ?? []) {
    notifications.push({
      id:         `campaign-${c.id}`,
      type:       'campaign_complete',
      title:      '✓ Campaign completed',
      body:       `${c.name} — ${c.sent_count.toLocaleString()} messages sent via ${c.channel}`,
      severity:   'info',
      created_at: c.completed_at ?? '',
      href:       '/dashboard/broadcast',
    })
  }

  // Sort by most recent
  notifications.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return NextResponse.json({
    notifications: notifications.slice(0, 10),
    count: notifications.length,
  })
}
