'use client'
// components/dashboard/StatsStrip.tsx
import type { DashboardStats } from '@/types'

interface Props { stats: DashboardStats }

export default function StatsStrip({ stats }: Props) {
  const cards = [
    {
      label: 'Voters Reached',
      value: stats.totalReached.toLocaleString(),
      delta: `↑ +${stats.todayReach.toLocaleString()} today`,
      accent: '#C9A84C',
    },
    {
      label: 'Delivery Rate',
      value: `${stats.deliveryRate}%`,
      delta: '↑ Across all channels',
      accent: '#1D9E75',
    },
    {
      label: 'Poll Responses',
      value: stats.totalSent > 0
        ? Math.round(stats.totalSent * (stats.responseRate / 100)).toLocaleString()
        : '0',
      delta: '↑ Live responses',
      accent: '#4A90D9',
    },
    {
      label: 'Field Alerts',
      value: String(stats.activeAlerts),
      delta: stats.activeAlerts > 0 ? '⚠ Require attention' : '✓ All clear',
      accent: stats.activeAlerts > 0 ? '#D85A30' : '#1D9E75',
      negative: stats.activeAlerts > 0,
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {cards.map(c => (
        <div
          key={c.label}
          className="bg-[#141414] border border-[rgba(201,168,76,0.10)] rounded-xl p-4 relative overflow-hidden"
          style={{ boxShadow: '0 1px 8px rgba(0,0,0,0.3)' }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-0 right-0 h-0.5"
            style={{ background: `linear-gradient(90deg, ${c.accent}, transparent)` }}
          />
          <div className="text-[9px] tracking-widest uppercase text-white/35 font-semibold mb-1">
            {c.label}
          </div>
          <div
            className="font-serif text-[26px] font-bold leading-none mb-1"
            style={{ color: c.accent }}
          >
            {c.value}
          </div>
          <div
            className="text-[10px] font-semibold"
            style={{ color: c.negative ? '#D85A30' : '#1D9E75' }}
          >
            {c.delta}
          </div>
        </div>
      ))}
    </div>
  )
}
