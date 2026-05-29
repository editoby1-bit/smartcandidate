'use client'
// components/dashboard/CampaignTable.tsx
import type { Campaign } from '@/types'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface Props { campaigns: Campaign[] }

const STATUS_STYLES: Record<string, string> = {
  running:   'pill pill-green',
  completed: 'pill pill-blue',
  scheduled: 'pill pill-gold',
  draft:     'pill pill-grey',
  paused:    'pill pill-gold',
  failed:    'pill pill-red',
}

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: '💬',
  sms:      '📱',
  voice:    '📞',
}

export function CampaignTable({ campaigns }: Props) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">
          Recent Campaigns
        </div>
        <Link href="/dashboard/broadcast" className="text-[10px] text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors">
          All campaigns →
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-8 text-white/25 text-sm">
          No campaigns yet. <Link href="/dashboard/broadcast" className="text-[#C9A84C]/60 underline">Create one →</Link>
        </div>
      ) : (
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[rgba(201,168,76,0.08)]">
              <th className="text-left pb-2 text-[8px] tracking-widest uppercase text-white/25 font-semibold">Campaign</th>
              <th className="text-left pb-2 text-[8px] tracking-widest uppercase text-white/25 font-semibold">Reach</th>
              <th className="text-left pb-2 text-[8px] tracking-widest uppercase text-white/25 font-semibold">Delivery</th>
              <th className="text-left pb-2 text-[8px] tracking-widest uppercase text-white/25 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => {
              const deliveryRate = c.sent_count > 0
                ? Math.round((c.delivered_count / c.sent_count) * 100) : 0
              const progress = c.total_targets > 0
                ? Math.round((c.sent_count / c.total_targets) * 100) : 0

              return (
                <tr key={c.id} className="border-b border-[rgba(201,168,76,0.05)] hover:bg-white/[0.015] transition-colors">
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <span>{CHANNEL_ICONS[c.channel] ?? '📢'}</span>
                      <div>
                        <div className="font-semibold text-white truncate max-w-[150px]">{c.name}</div>
                        <div className="text-[9px] text-white/30">
                          {c.target_lga ?? c.target_state ?? 'All Lagos'} · {c.language}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="font-mono text-[#F2D98A]">{c.sent_count.toLocaleString()}</div>
                    <div className="text-[9px] text-white/30">of {c.total_targets.toLocaleString()}</div>
                  </td>
                  <td className="py-2.5">
                    <div className="font-semibold text-[#1D9E75]">{deliveryRate}%</div>
                    <div className="w-16 h-0.5 bg-white/8 rounded-full mt-1">
                      <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className={STATUS_STYLES[c.status] ?? 'pill pill-grey'}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default CampaignTable
