'use client'
// components/dashboard/SentimentChart.tsx
import type { SentimentBreakdown } from '@/types'

interface Props { sentiment: SentimentBreakdown }

export default function SentimentChart({ sentiment }: Props) {
  const { positive, neutral, negative, total, score, byTopic } = sentiment

  return (
    <div className="card">
      <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
        Voter Sentiment — Live
      </div>

      {/* Score */}
      <div className="text-center mb-4">
        <div className="font-serif text-4xl font-black text-[#1D9E75]">{score}%</div>
        <div className="text-[10px] text-white/35 mt-0.5">{total.toLocaleString()} responses</div>
      </div>

      {/* Bars */}
      {[
        { label: 'Positive', count: positive, color: '#1D9E75' },
        { label: 'Neutral',  count: neutral,  color: '#C9A84C' },
        { label: 'Negative', count: negative, color: '#D85A30' },
      ].map(row => (
        <div key={row.label} className="mb-2">
          <div className="flex justify-between text-[10px] mb-0.5">
            <span className="text-white/50">{row.label}</span>
            <span className="font-mono font-semibold" style={{ color: row.color }}>
              {total > 0 ? Math.round((row.count / total) * 100) : 0}%
            </span>
          </div>
          <div className="h-1.5 bg-white/6 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: total > 0 ? `${(row.count / total) * 100}%` : '0%',
                background: row.color,
              }}
            />
          </div>
        </div>
      ))}

      {/* By topic */}
      {byTopic.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="text-[9px] tracking-widest uppercase text-white/25 mb-2">By Issue</div>
          {byTopic.slice(0, 5).map(t => {
            const tTotal = t.positive + t.neutral + t.negative
            const tScore = tTotal > 0 ? Math.round((t.positive / tTotal) * 100) : 0
            return (
              <div key={t.topic} className="flex items-center gap-2">
                <div className="text-[10px] capitalize text-white/50 w-24 truncate">{t.topic}</div>
                <div className="flex-1 h-1.5 bg-white/6 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${tScore}%`,
                      background: tScore >= 60 ? '#1D9E75' : tScore >= 40 ? '#C9A84C' : '#D85A30',
                    }}
                  />
                </div>
                <div className="text-[10px] font-mono w-8 text-right" style={{
                  color: tScore >= 60 ? '#1D9E75' : tScore >= 40 ? '#F2D98A' : '#D85A30',
                }}>
                  {tScore}%
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
