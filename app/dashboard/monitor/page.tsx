// app/dashboard/monitor/page.tsx
import { createServerSupabase } from '@/lib/db/supabase-server'
import FieldReportFeed from '@/components/field/FieldReportFeed'
import AgentStatus from '@/components/field/AgentStatus'
import ResultAggregation from '@/components/field/ResultAggregation'

export const revalidate = 15

export default async function MonitorPage() {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  const { data: userRow } = await db.from('users').select('candidate_id').eq('id', user!.id).single()
  const cid = userRow!.candidate_id

  const [reports, agents, results] = await Promise.all([
    db.from('field_reports')
      .select('*, field_agents(name, phone, assigned_ward)')
      .eq('candidate_id', cid)
      .order('created_at', { ascending: false })
      .limit(30),
    db.from('field_agents')
      .select('*')
      .eq('candidate_id', cid)
      .eq('status', 'active'),
    db.from('result_captures')
      .select('*')
      .eq('candidate_id', cid)
      .order('submitted_at', { ascending: false }),
  ])

  const totalPUs       = agents.data?.length ?? 0
  const reportingPUs   = results.data?.length ?? 0
  const candidateVotes = results.data?.reduce((s, r) => s + r.candidate_votes, 0) ?? 0
  const opponentVotes  = results.data?.reduce((s, r) => s + (r.opponent_votes ?? 0), 0) ?? 0

  return (
    <div className="max-w-[1300px] space-y-5">
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">
          Election Day · Live Monitoring
        </div>
        <h1 className="font-serif text-3xl font-black text-white">
          Field Reports & <span className="text-[#C9A84C]">Result Aggregation</span>
        </h1>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Agents Active',    value: totalPUs.toLocaleString(), color: '#1D9E75', delta: '↑ Check-in required' },
          { label: 'Reports Received', value: (reports.data?.length ?? 0).toLocaleString(), color: '#C9A84C', delta: '↑ Live stream' },
          { label: 'Urgent Alerts',    value: String(reports.data?.filter(r => r.severity === 'critical' || r.severity === 'high').length ?? 0), color: '#D85A30', delta: '⚠ Require action' },
          { label: 'PUs Reporting',    value: `${reportingPUs}/${totalPUs || '?'}`, color: '#4A90D9', delta: `${totalPUs > 0 ? Math.round((reportingPUs/totalPUs)*100) : 0}% coverage` },
        ].map(c => (
          <div key={c.label} className="card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${c.color}, transparent)` }} />
            <div className="text-[9px] uppercase tracking-widest text-white/35 mb-1">{c.label}</div>
            <div className="font-serif text-2xl font-bold leading-none mb-1" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[10px] text-white/30">{c.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-5">
        <div className="space-y-5">
          <FieldReportFeed reports={reports.data ?? []} />
        </div>
        <div className="space-y-5">
          <ResultAggregation
            candidateVotes={candidateVotes}
            opponentVotes={opponentVotes}
            reportingPUs={reportingPUs}
            totalPUs={totalPUs}
            results={results.data ?? []}
          />
          <AgentStatus agents={agents.data ?? []} />
        </div>
      </div>
    </div>
  )
}
