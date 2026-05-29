'use client'
// components/dashboard/WardHeatmap.tsx
import { useState } from 'react'
import type { WardSnapshot } from '@/types'

interface Props { snapshots: WardSnapshot[] }

export default function WardHeatmap({ snapshots }: Props) {
  const [metric, setMetric] = useState<'reach' | 'sentiment' | 'response'>('reach')
  const [hovered, setHovered] = useState<WardSnapshot | null>(null)

  function getScore(s: WardSnapshot) {
    if (metric === 'reach')     return s.reach_pct ?? 0
    if (metric === 'sentiment') return s.sentiment_score ?? 0
    if (metric === 'response')  return s.response_rate ?? 0
    return 0
  }

  function getColor(score: number) {
    if (score >= 80) return 'rgba(29,158,117,0.7)'
    if (score >= 60) return 'rgba(201,168,76,0.6)'
    if (score >= 40) return 'rgba(74,144,217,0.55)'
    return 'rgba(216,90,48,0.5)'
  }

  function getBorder(score: number) {
    if (score >= 80) return 'rgba(29,158,117,0.5)'
    if (score >= 60) return 'rgba(201,168,76,0.5)'
    if (score >= 40) return 'rgba(74,144,217,0.45)'
    return 'rgba(216,90,48,0.4)'
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">
          Ward Reach Heatmap — Lagos State
        </div>
        <div className="flex gap-1.5">
          {(['reach', 'sentiment', 'response'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`text-[9px] font-bold px-2.5 py-1 rounded-md capitalize transition-all ${
                metric === m
                  ? 'bg-[#C9A84C] text-black'
                  : 'bg-[#1A1A1A] text-white/40 border border-[rgba(201,168,76,0.15)] hover:text-white/70'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {snapshots.length === 0 ? (
          // Placeholder when no data yet
          Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              className="aspect-square rounded-md bg-white/5 border border-white/5 flex items-center justify-center text-[8px] text-white/20"
            >
              —
            </div>
          ))
        ) : (
          snapshots.map(s => {
            const score = getScore(s)
            return (
              <div
                key={s.id}
                className="aspect-square rounded-md flex items-center justify-center text-[9px] font-bold cursor-pointer transition-transform hover:scale-110 relative"
                style={{
                  background: getColor(score),
                  border: `1px solid ${getBorder(score)}`,
                  color: 'white',
                }}
                onMouseEnter={() => setHovered(s)}
                onMouseLeave={() => setHovered(null)}
                title={`${s.lga} · ${s.ward}`}
              >
                {score.toFixed(0)}%
                {hovered === s && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 bg-[#0F0F0F] border border-[rgba(201,168,76,0.3)] rounded-lg p-2 text-[9px] whitespace-nowrap z-10 pointer-events-none shadow-xl">
                    <div className="font-semibold text-white mb-0.5">{s.lga} · {s.ward}</div>
                    <div className="text-white/50">Reach: {s.reach_pct?.toFixed(0)}%</div>
                    <div className="text-white/50">Sentiment: {s.sentiment_score?.toFixed(0)}%</div>
                    <div className="text-white/50">Responses: {s.response_count}</div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-4 mt-3 flex-wrap">
        {[
          { color: 'rgba(29,158,117,0.7)', label: '80%+ — Excellent' },
          { color: 'rgba(201,168,76,0.6)', label: '60–79% — Good' },
          { color: 'rgba(74,144,217,0.55)', label: '40–59% — Moderate' },
          { color: 'rgba(216,90,48,0.5)',  label: '<40% — Needs work' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5 text-[9px] text-white/50">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  )
}
