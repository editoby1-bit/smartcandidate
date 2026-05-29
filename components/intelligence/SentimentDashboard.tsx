'use client'
// components/intelligence/SentimentDashboard.tsx
import type { SentimentBreakdown } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface Response {
  id: string
  sentiment: string | null
  topic: string | null
  lga: string | null
  ward: string | null
  response_text: string | null
  channel: string
  received_at: string
}

interface Props {
  sentiment: SentimentBreakdown
  responses: Response[]
}

const SENTIMENT_COLOR = {
  positive: { text: 'text-[#1D9E75]', bg: 'bg-[#1D9E75]/10', border: 'border-[#1D9E75]/25' },
  neutral:  { text: 'text-[#F2D98A]', bg: 'bg-[#C9A84C]/8',  border: 'border-[#C9A84C]/20' },
  negative: { text: 'text-[#D85A30]', bg: 'bg-[#D85A30]/8',  border: 'border-[#D85A30]/20' },
}

const CHANNEL_ICON: Record<string, string> = {
  whatsapp: '💬', sms: '📱', voice: '📞'
}

export default function SentimentDashboard({ sentiment, responses }: Props) {
  const { positive, neutral, negative, total, score, byTopic, byLGA } = sentiment

  return (
    <div className="space-y-4">
      {/* Overview card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">
            Sentiment Overview — Last 7 Days
          </div>
          <div className="text-[10px] text-white/30 font-mono">
            {total.toLocaleString()} responses
          </div>
        </div>

        <div className="text-center mb-5">
          <div className="font-serif text-5xl font-black text-[#1D9E75] mb-1">{score}%</div>
          <div className="text-[11px] text-white/35">Overall positive sentiment</div>
          {score >= 65 && (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-[#1D9E75]/10 border border-[#1D9E75]/25 px-3 py-1 rounded-full text-[10px] text-[#1D9E75] font-bold">
              ✓ 65% approval threshold met
            </div>
          )}
        </div>

        {/* Three bars */}
        {[
          { label: 'Strongly positive', count: Math.round(positive * 0.7), max: total },
          { label: 'Leaning positive',  count: Math.round(positive * 0.3), max: total },
          { label: 'Undecided',         count: neutral,  max: total },
          { label: 'Opposed',           count: negative, max: total },
        ].map((row, i) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
          const color = i < 2 ? '#1D9E75' : i === 2 ? '#C9A84C' : '#D85A30'
          return (
            <div key={row.label} className="flex items-center gap-3 mb-2">
              <div className="text-[11px] text-white/45 w-36 flex-shrink-0">{row.label}</div>
              <div className="flex-1 h-1.5 bg-white/6 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${pct}%`, background: color, opacity: 0.75 }}
                />
              </div>
              <div className="text-[10px] font-mono font-semibold w-8 text-right" style={{ color }}>
                {pct}%
              </div>
            </div>
          )
        })}
      </div>

      {/* By topic */}
      <div className="card">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
          Sentiment by Issue
        </div>
        {byTopic.length === 0 ? (
          <div className="text-center py-4 text-white/25 text-sm">No data yet</div>
        ) : (
          <div className="space-y-2.5">
            {byTopic
              .map(t => ({
                ...t,
                total: t.positive + t.neutral + t.negative,
                score: t.positive + t.neutral + t.negative > 0
                  ? Math.round((t.positive / (t.positive + t.neutral + t.negative)) * 100) : 0
              }))
              .sort((a, b) => b.total - a.total)
              .slice(0, 8)
              .map(t => (
                <div key={t.topic} className="flex items-center gap-3">
                  <div className="text-[11px] capitalize text-white/55 w-24 flex-shrink-0">{t.topic}</div>
                  <div className="flex-1 flex h-2 rounded-full overflow-hidden gap-px">
                    <div style={{ width: `${t.total > 0 ? (t.positive/t.total)*100 : 0}%`, background: '#1D9E75' }} />
                    <div style={{ width: `${t.total > 0 ? (t.neutral/t.total)*100 : 0}%`,  background: '#C9A84C', opacity: .6 }} />
                    <div style={{ width: `${t.total > 0 ? (t.negative/t.total)*100 : 0}%`, background: '#D85A30' }} />
                  </div>
                  <div
                    className="text-[10px] font-bold font-mono w-8 text-right"
                    style={{ color: t.score >= 60 ? '#1D9E75' : t.score >= 40 ? '#F2D98A' : '#D85A30' }}
                  >
                    {t.score}%
                  </div>
                  <div className="text-[9px] text-white/25 w-12 text-right">{t.total.toLocaleString()}</div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Live responses feed */}
      <div className="card">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
          Recent Voter Responses
        </div>
        {responses.length === 0 ? (
          <div className="text-center py-4 text-white/25 text-sm">No responses yet</div>
        ) : (
          <div className="space-y-2 max-h-[280px] overflow-y-auto">
            {responses.map(r => {
              const s = r.sentiment as keyof typeof SENTIMENT_COLOR
              const c = SENTIMENT_COLOR[s] ?? SENTIMENT_COLOR.neutral
              return (
                <div key={r.id} className={`${c.bg} border ${c.border} rounded-lg p-2.5`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span>{CHANNEL_ICON[r.channel] ?? '📢'}</span>
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${c.text}`}>
                      {r.sentiment}
                    </span>
                    {r.topic && (
                      <span className="text-[9px] text-white/30 capitalize">· {r.topic}</span>
                    )}
                    {r.lga && (
                      <span className="text-[9px] text-[#C9A84C]/50">· {r.lga}</span>
                    )}
                    <span className="ml-auto text-[9px] text-white/20 font-mono">
                      {formatDistanceToNow(new Date(r.received_at), { addSuffix: true })}
                    </span>
                  </div>
                  {r.response_text && r.response_text !== `DTMF:${r.response_text?.replace('DTMF:','')}` && (
                    <p className="text-[11px] text-white/60 leading-snug line-clamp-2">
                      {r.response_text}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
