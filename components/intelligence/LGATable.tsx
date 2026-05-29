'use client'
// components/intelligence/LGATable.tsx
import type { WardSnapshot } from '@/types'
import Link from 'next/link'

interface Props { wards: WardSnapshot[] }

export default function LGATable({ wards }: Props) {
  // Group by LGA
  const lgaMap = new Map<string, {
    lga: string
    total: number
    reached: number
    positive: number
    neutral: number
    negative: number
    responses: number
  }>()

  for (const w of wards) {
    if (!lgaMap.has(w.lga)) {
      lgaMap.set(w.lga, { lga: w.lga, total: 0, reached: 0, positive: 0, neutral: 0, negative: 0, responses: 0 })
    }
    const entry = lgaMap.get(w.lga)!
    entry.total     += w.recipients_total
    entry.reached   += w.recipients_reached
    entry.positive  += w.positive_count
    entry.neutral   += w.neutral_count
    entry.negative  += w.negative_count
    entry.responses += w.response_count
  }

  const lgas = Array.from(lgaMap.values())
    .map(l => ({
      ...l,
      reachPct:      l.total > 0 ? Math.round((l.reached / l.total) * 100) : 0,
      sentimentScore: l.responses > 0 ? Math.round((l.positive / l.responses) * 100) : 0,
    }))
    .sort((a, b) => b.responses - a.responses)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">
          LGA Sentiment Matrix
        </div>
        <Link href="/dashboard/targeting" className="text-[10px] text-[#C9A84C]/50 hover:text-[#C9A84C]">
          Full map →
        </Link>
      </div>

      {lgas.length === 0 ? (
        <div className="text-center py-6 text-white/25 text-sm">
          No ward data yet — launch a campaign to populate.
        </div>
      ) : (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[rgba(201,168,76,0.08)]">
              {['LGA', 'Reach', 'Sentiment', 'Responses', 'Action'].map(h => (
                <th key={h} className="text-left pb-2 text-[8px] tracking-widest uppercase text-white/25 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lgas.map(l => (
              <tr key={l.lga} className="border-b border-[rgba(201,168,76,0.05)] hover:bg-white/[0.015]">
                <td className="py-2.5 font-semibold text-white">{l.lga}</td>
                <td className="py-2.5">
                  <div className="text-[#F2D98A] font-semibold text-[10px]">{l.reachPct}%</div>
                  <div className="w-14 h-0.5 bg-white/8 rounded-full mt-1">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${l.reachPct}%`,
                        background: l.reachPct >= 80 ? '#1D9E75' : l.reachPct >= 50 ? '#C9A84C' : '#D85A30'
                      }}
                    />
                  </div>
                </td>
                <td className="py-2.5">
                  <div
                    className="font-bold text-[10px]"
                    style={{ color: l.sentimentScore >= 60 ? '#1D9E75' : l.sentimentScore >= 40 ? '#F2D98A' : '#D85A30' }}
                  >
                    {l.responses > 0 ? `${l.sentimentScore}%` : '—'}
                  </div>
                </td>
                <td className="py-2.5 font-mono text-white/50">{l.responses.toLocaleString()}</td>
                <td className="py-2.5">
                  {l.sentimentScore < 65 && l.responses > 0 ? (
                    <Link
                      href={`/dashboard/broadcast?lga=${encodeURIComponent(l.lga)}`}
                      className="pill pill-red hover:bg-[#D85A30]/20 transition-colors cursor-pointer"
                    >
                      Boost
                    </Link>
                  ) : (
                    <span className="pill pill-green">Good</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
