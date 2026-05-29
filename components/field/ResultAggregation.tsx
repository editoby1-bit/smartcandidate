'use client'
// components/field/ResultAggregation.tsx
import type { ResultCapture } from '@/types'

interface Props {
  candidateVotes: number
  opponentVotes: number
  reportingPUs: number
  totalPUs: number
  results: ResultCapture[]
}

export function ResultAggregation({ candidateVotes, opponentVotes, reportingPUs, totalPUs, results }: Props) {
  const total = candidateVotes + opponentVotes
  const candPct = total > 0 ? Math.round((candidateVotes / total) * 100) : 0
  const oppPct  = total > 0 ? Math.round((opponentVotes / total) * 100) : 0
  const coverage = totalPUs > 0 ? Math.round((reportingPUs / totalPUs) * 100) : 0

  return (
    <div className="card">
      <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
        Live Result Aggregation
      </div>

      {reportingPUs === 0 ? (
        <div className="text-center py-4 text-white/25 text-sm">
          No results captured yet
        </div>
      ) : (
        <>
          <div className="text-center mb-4">
            <div className="text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">
              Campaign Lead ({reportingPUs} PUs)
            </div>
            <div className="font-serif text-4xl font-black text-[#1D9E75]">{candPct}%</div>
            <div className="text-[10px] text-white/30 mt-0.5">
              vs opponent {oppPct}%
            </div>
          </div>

          <div className="space-y-1.5 mb-3">
            {[
              { label: 'Adeyemi', pct: candPct, votes: candidateVotes, color: '#1D9E75' },
              { label: 'Opponent', pct: oppPct, votes: opponentVotes, color: '#D85A30' },
            ].map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <div className="text-[10px] text-white/50 w-16 flex-shrink-0">{r.label}</div>
                <div className="flex-1 h-1.5 bg-white/6 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
                <div className="text-[10px] font-bold font-mono w-10 text-right" style={{ color: r.color }}>
                  {r.pct}%
                </div>
                <div className="text-[9px] text-white/25 font-mono w-16 text-right">
                  {r.votes.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-[9px] text-white/25 flex-1">Coverage</div>
            <div className="flex-1 h-1 bg-white/6 rounded-full overflow-hidden">
              <div className="h-full bg-[#4A90D9] rounded-full" style={{ width: `${coverage}%` }} />
            </div>
            <div className="text-[9px] font-mono text-[#4A90D9] w-12 text-right">{reportingPUs}/{totalPUs}</div>
          </div>

          <div className="text-[9px] text-white/20 font-mono text-center mt-2">
            Auto-updating · Independent of INEC
          </div>
        </>
      )}
    </div>
  )
}

export default ResultAggregation
