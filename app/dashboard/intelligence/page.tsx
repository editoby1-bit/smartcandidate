// app/dashboard/intelligence/page.tsx
import { createServerSupabase } from '@/lib/db/supabase-server'
import { getSentimentBreakdown } from '@/lib/analytics/aggregator'
import PollResults from '@/components/intelligence/PollResults'
import SentimentDashboard from '@/components/intelligence/SentimentDashboard'
import LGATable from '@/components/intelligence/LGATable'

export const revalidate = 60

export default async function IntelligencePage() {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  const { data: userRow } = await db.from('users').select('candidate_id').eq('id', user!.id).single()
  const candidateId = userRow!.candidate_id

  const [sentiment, polls, recentResponses, wardData] = await Promise.all([
    getSentimentBreakdown(candidateId, 7),
    db.from('polls').select('*').order('created_at', { ascending: false }).limit(5),
    db.from('responses')
      .select('id, sentiment, topic, lga, ward, response_text, channel, received_at')
      .eq('candidate_id', candidateId)
      .not('sentiment', 'is', null)
      .order('received_at', { ascending: false })
      .limit(50),
    db.from('ward_snapshots')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('sentiment_score', { ascending: true })
      .limit(20),
  ])

  return (
    <div className="max-w-[1300px] space-y-5">
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Real-time Intelligence</div>
        <h1 className="font-serif text-3xl font-black text-white">
          Voter <span className="text-[#C9A84C]">Sentiment & Data</span>
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Ward-level polling, sentiment analysis, and issue tracking.
        </p>
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-5">
        <div className="space-y-5">
          <SentimentDashboard sentiment={sentiment} responses={recentResponses.data ?? []} />
          <LGATable wards={wardData.data ?? []} />
        </div>
        <div className="space-y-5">
          <PollResults polls={polls.data ?? []} candidateId={candidateId} />
        </div>
      </div>
    </div>
  )
}
