'use client'
// components/dashboard/ActivityFeed.tsx
import type { FieldReport } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface Props { reports: (FieldReport & { field_agents?: { name: string } | null })[] }

const SEVERITY_COLORS = {
  critical: { bg: 'bg-[#D85A30]/10', border: 'border-[#D85A30]/30', dot: 'bg-[#D85A30]', text: 'text-[#D85A30]' },
  high:     { bg: 'bg-[#D85A30]/6',  border: 'border-[#D85A30]/20', dot: 'bg-[#D85A30]', text: 'text-[#D85A30]' },
  medium:   { bg: 'bg-[#C9A84C]/6',  border: 'border-[#C9A84C]/20', dot: 'bg-[#C9A84C]', text: 'text-[#F2D98A]' },
  low:      { bg: 'bg-white/3',       border: 'border-white/8',       dot: 'bg-white/30',  text: 'text-white/40' },
}

export function ActivityFeed({ reports }: Props) {
  if (reports.length === 0) {
    return (
      <div className="card">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">Live Activity</div>
        <div className="text-center py-6 text-white/25 text-sm">No active field reports</div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
        Field Alerts
      </div>
      <div className="space-y-2">
        {reports.map(r => {
          const c = SEVERITY_COLORS[r.severity as keyof typeof SEVERITY_COLORS] ?? SEVERITY_COLORS.low
          return (
            <div key={r.id} className={`${c.bg} border ${c.border} rounded-lg p-3`}>
              <div className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${c.dot} mt-1.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wide ${c.text}`}>
                      {r.report_type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[9px] text-white/25 font-mono">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#C9A84C]/70 mb-0.5">
                    {r.lga} · {r.ward}
                  </div>
                  <p className="text-[11px] text-white/60 leading-snug line-clamp-2">
                    {r.description}
                  </p>
                  {r.field_agents && (
                    <div className="text-[9px] text-white/30 mt-1">
                      Agent: {r.field_agents.name}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ActivityFeed
