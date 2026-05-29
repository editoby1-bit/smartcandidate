// app/dashboard/page.tsx
import { createServerSupabase } from '@/lib/db/supabase-server'
import { getDashboardStats, getSentimentBreakdown } from '@/lib/analytics/aggregator'
import StatsStrip from '@/components/dashboard/StatsStrip'
import WardHeatmap from '@/components/dashboard/WardHeatmap'
import SentimentChart from '@/components/dashboard/SentimentChart'
import ActivityFeed from '@/components/dashboard/ActivityFeed'
import ChannelCards from '@/components/dashboard/ChannelCards'
import CampaignTable from '@/components/dashboard/CampaignTable'

export const revalidate = 30 // revalidate every 30 seconds

export default async function DashboardPage() {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  const { data: userRow } = await db
    .from('users').select('candidate_id').eq('id', user!.id).single()

  const candidateId = userRow?.candidate_id!

  const [stats, sentiment, wardSnapshots, recentCampaigns, recentReports] = await Promise.all([
    getDashboardStats(candidateId),
    getSentimentBreakdown(candidateId, 7),
    db.from('ward_snapshots')
      .select('*')
      .order('reach_pct', { ascending: false })
      .limit(25),
    db.from('campaigns')
      .select('*')
      .in('status', ['running', 'completed', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(5),
    db.from('field_reports')
      .select('*, field_agents(name)')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  return (
    <div className="space-y-5 max-w-[1400px]">
      {/* Header */}
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">
          Command Centre · Live View
        </div>
        <h1 className="font-serif text-3xl font-black text-white leading-tight">
          Campaign <span className="text-[#C9A84C]">Overview</span>
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Real-time intelligence across all 20 LGAs. Last updated just now.
        </p>
      </div>

      {/* KPI strip */}
      <StatsStrip stats={stats} />

      {/* Main grid */}
      <div className="grid grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <WardHeatmap snapshots={wardSnapshots.data ?? []} />
          <ChannelCards stats={stats.channelBreakdown} />
          <CampaignTable campaigns={recentCampaigns.data ?? []} />
        </div>
        <div className="space-y-5">
          <SentimentChart sentiment={sentiment} />
          <ActivityFeed reports={recentReports.data ?? []} />
        </div>
      </div>
    </div>
  )
}
