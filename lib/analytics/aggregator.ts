// lib/analytics/aggregator.ts
// Pre-computes analytics snapshots so dashboards load instantly.
// Called by the analytics worker every 15 minutes.

import { createServiceSupabase } from '@/lib/db/supabase'
import type { DashboardStats, SentimentBreakdown } from '@/types'

// ── Ward snapshots ────────────────────────────────────────────
// For each ward: how many recipients, how many reached, sentiment

export async function refreshWardSnapshots(candidateId: string) {
  const db = createServiceSupabase()

  // Get all wards for this candidate
  const { data: wards } = await db
    .from('recipients')
    .select('state, lga, ward')
    .eq('candidate_id', candidateId)
    .not('ward', 'is', null)

  if (!wards) return

  // Deduplicate
  const unique = new Map<string, { state: string; lga: string; ward: string }>()
  for (const r of wards) {
    if (r.ward) {
      const key = `${r.state}|${r.lga}|${r.ward}`
      unique.set(key, { state: r.state!, lga: r.lga!, ward: r.ward })
    }
  }

  for (const [, geo] of unique) {
    await refreshSingleWard(candidateId, geo.state, geo.lga, geo.ward)
  }
}

async function refreshSingleWard(
  candidateId: string,
  state: string,
  lga: string,
  ward: string
) {
  const db = createServiceSupabase()

  // Total recipients in ward
  const { count: totalRecipients } = await db
    .from('recipients')
    .select('id', { count: 'exact', head: true })
    .eq('candidate_id', candidateId)
    .eq('state', state)
    .eq('lga', lga)
    .eq('ward', ward)

  // Reached (received at least one send)
  const { count: reached } = await db
    .from('sends')
    .select('recipient_id', { count: 'exact', head: true })
    .eq('state', state)
    .eq('lga', lga)
    .eq('ward', ward)
    .in('status', ['sent', 'delivered'])

  // Delivered
  const { count: delivered } = await db
    .from('sends')
    .select('id', { count: 'exact', head: true })
    .eq('state', state)
    .eq('lga', lga)
    .eq('ward', ward)
    .eq('status', 'delivered')

  const { count: sent } = await db
    .from('sends')
    .select('id', { count: 'exact', head: true })
    .eq('state', state)
    .eq('lga', lga)
    .eq('ward', ward)
    .in('status', ['sent', 'delivered', 'failed'])

  // Responses
  const { data: responseData } = await db
    .from('responses')
    .select('sentiment, id')
    .eq('candidate_id', candidateId)
    .eq('state', state)
    .eq('lga', lga)
    .eq('ward', ward)

  const positive = responseData?.filter(r => r.sentiment === 'positive').length ?? 0
  const neutral  = responseData?.filter(r => r.sentiment === 'neutral').length ?? 0
  const negative = responseData?.filter(r => r.sentiment === 'negative').length ?? 0
  const totalResp = (responseData?.length ?? 0)

  const reachPct     = totalRecipients ? Math.round(((reached ?? 0) / totalRecipients) * 100) : 0
  const deliveryRate = (sent ?? 0) > 0 ? Math.round(((delivered ?? 0) / (sent ?? 1)) * 100) : 0
  const responseRate = (reached ?? 0) > 0 ? Math.round((totalResp / (reached ?? 1)) * 100) : 0
  const sentimentScore = totalResp > 0 ? Math.round((positive / totalResp) * 100) : 0

  // Upsert snapshot
  await db.from('ward_snapshots').upsert({
    candidate_id:       candidateId,
    state,
    lga,
    ward,
    snapshot_at:        new Date().toISOString(),
    recipients_total:   totalRecipients ?? 0,
    recipients_reached: reached ?? 0,
    reach_pct:          reachPct,
    sent_total:         sent ?? 0,
    delivered_total:    delivered ?? 0,
    delivery_rate:      deliveryRate,
    response_count:     totalResp,
    response_rate:      responseRate,
    positive_count:     positive,
    neutral_count:      neutral,
    negative_count:     negative,
    sentiment_score:    sentimentScore,
  }, { onConflict: 'candidate_id,state,lga,ward' })
}

// ── Dashboard KPIs ────────────────────────────────────────────

export async function getDashboardStats(candidateId: string): Promise<DashboardStats> {
  const db = createServiceSupabase()

  const [
    { count: totalSent },
    { count: totalDelivered },
    { count: totalResponses },
    { count: activeCampaigns },
    { count: activeAlerts },
    { data: sentimentData },
    { data: channelData },
    { count: todayReach },
  ] = await Promise.all([
    db.from('sends').select('id', { count: 'exact', head: true })
      .eq('candidate_id', candidateId)
      .in('status', ['sent', 'delivered', 'failed']),

    db.from('sends').select('id', { count: 'exact', head: true })
      .eq('candidate_id', candidateId)
      .eq('status', 'delivered'),

    db.from('responses').select('id', { count: 'exact', head: true })
      .eq('candidate_id', candidateId),

    db.from('campaigns').select('id', { count: 'exact', head: true })
      .eq('candidate_id', candidateId)
      .eq('status', 'running'),

    db.from('field_reports').select('id', { count: 'exact', head: true })
      .eq('candidate_id', candidateId)
      .eq('status', 'open')
      .in('severity', ['high', 'critical']),

    db.from('responses').select('sentiment')
      .eq('candidate_id', candidateId),

    db.from('sends').select('campaign_id, status')
      .eq('candidate_id', candidateId),

    db.from('sends').select('id', { count: 'exact', head: true })
      .eq('candidate_id', candidateId)
      .gte('attempted_at', new Date(Date.now() - 86400000).toISOString()),
  ])

  const positive = sentimentData?.filter(r => r.sentiment === 'positive').length ?? 0
  const total    = sentimentData?.length ?? 0
  const sentimentScore = total > 0 ? Math.round((positive / total) * 100) : 0

  const delivered = totalDelivered ?? 0
  const sent = totalSent ?? 0
  const deliveryRate = sent > 0 ? Math.round((delivered / sent) * 100) : 0
  const responseRate = delivered > 0 ? Math.round(((totalResponses ?? 0) / delivered) * 100) : 0

  // Unique recipients reached (approx)
  const totalReached = delivered

  return {
    totalReached,
    totalSent: sent,
    deliveryRate,
    openRate: deliveryRate, // approximation — WA read receipts not always available
    responseRate,
    sentimentScore,
    activeAlerts: activeAlerts ?? 0,
    activeCampaigns: activeCampaigns ?? 0,
    todayReach: todayReach ?? 0,
    channelBreakdown: {
      whatsapp: { sent: 0, delivered: 0, rate: 0 }, // TODO: filter by channel
      sms:      { sent: 0, delivered: 0, rate: 0 },
      voice:    { sent: 0, delivered: 0, rate: 0 },
    }
  }
}

// ── Sentiment breakdown ───────────────────────────────────────

export async function getSentimentBreakdown(
  candidateId: string,
  days = 7
): Promise<SentimentBreakdown> {
  const db = createServiceSupabase()
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const { data } = await db
    .from('responses')
    .select('sentiment, topic, lga')
    .eq('candidate_id', candidateId)
    .gte('received_at', since)
    .not('sentiment', 'is', null)

  if (!data?.length) {
    return { positive: 0, neutral: 0, negative: 0, total: 0, score: 0, byTopic: [], byLGA: [] }
  }

  const positive = data.filter(r => r.sentiment === 'positive').length
  const neutral  = data.filter(r => r.sentiment === 'neutral').length
  const negative = data.filter(r => r.sentiment === 'negative').length
  const total    = data.length

  // By topic
  const topicMap = new Map<string, { positive: number; neutral: number; negative: number }>()
  for (const r of data) {
    const t = r.topic ?? 'general'
    if (!topicMap.has(t)) topicMap.set(t, { positive: 0, neutral: 0, negative: 0 })
    const entry = topicMap.get(t)!
    if (r.sentiment === 'positive') entry.positive++
    else if (r.sentiment === 'neutral') entry.neutral++
    else entry.negative++
  }

  // By LGA
  const lgaMap = new Map<string, { score: number; total: number; positive: number }>()
  for (const r of data) {
    if (!r.lga) continue
    if (!lgaMap.has(r.lga)) lgaMap.set(r.lga, { score: 0, total: 0, positive: 0 })
    const entry = lgaMap.get(r.lga)!
    entry.total++
    if (r.sentiment === 'positive') entry.positive++
  }

  return {
    positive,
    neutral,
    negative,
    total,
    score: Math.round((positive / total) * 100),
    byTopic: Array.from(topicMap.entries()).map(([topic, counts]) => ({ topic, ...counts })),
    byLGA: Array.from(lgaMap.entries()).map(([lga, { total, positive }]) => ({
      lga,
      score: Math.round((positive / total) * 100),
      total,
    })).sort((a, b) => b.total - a.total),
  }
}
