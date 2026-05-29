'use client'
// components/field/FieldReportFeed.tsx
import { useState } from 'react'
import type { FieldReport } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface Props { reports: (FieldReport & { field_agents?: { name: string; phone: string; assigned_ward: string | null } | null })[] }

const SEV = {
  critical: { border: 'border-[#D85A30]/40', bg: 'bg-[#D85A30]/5', dot: 'bg-[#D85A30]', label: 'text-[#D85A30]' },
  high:     { border: 'border-[#D85A30]/25', bg: 'bg-[#D85A30]/3', dot: 'bg-[#D85A30]/70', label: 'text-[#D85A30]/80' },
  medium:   { border: 'border-[#C9A84C]/25', bg: 'bg-[#C9A84C]/4', dot: 'bg-[#C9A84C]', label: 'text-[#F2D98A]' },
  low:      { border: 'border-white/8',       bg: 'bg-white/2',     dot: 'bg-white/25', label: 'text-white/40' },
}

export default function FieldReportFeed({ reports }: Props) {
  const [filter, setFilter] = useState<'all' | 'open' | 'critical'>('all')

  const filtered = reports.filter(r => {
    if (filter === 'critical') return r.severity === 'critical' || r.severity === 'high'
    if (filter === 'open')     return r.status === 'open'
    return true
  })

  async function resolve(id: string) {
    await fetch(`/api/field-reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved', resolved_at: new Date().toISOString() }),
    })
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">
          Incoming Field Reports
        </div>
        <div className="flex gap-1.5">
          {(['all', 'open', 'critical'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[9px] font-bold px-2.5 py-1 rounded-md capitalize transition-all ${
                filter === f
                  ? 'bg-[#C9A84C] text-black'
                  : 'bg-[#1A1A1A] text-white/40 border border-white/8 hover:text-white/70'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-white/25 text-sm">No reports matching filter</div>
      ) : (
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto">
          {filtered.map(r => {
            const s = SEV[r.severity as keyof typeof SEV] ?? SEV.low
            return (
              <div key={r.id} className={`border ${s.border} ${s.bg} rounded-xl p-3.5`}>
                <div className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full ${s.dot} mt-1.5 flex-shrink-0 ${r.severity === 'critical' ? 'pulse-dot' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[9px] font-bold uppercase tracking-wide ${s.label}`}>
                        {r.report_type.replace(/_/g, ' ')}
                      </span>
                      <span className={`pill ${r.severity === 'critical' ? 'pill-red' : r.severity === 'high' ? 'pill-red' : r.severity === 'medium' ? 'pill-gold' : 'pill-grey'}`}>
                        {r.severity}
                      </span>
                      <span className="text-[9px] text-white/25 font-mono ml-auto">
                        {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#C9A84C]/60 mb-1">
                      {r.lga} · {r.ward}
                      {r.polling_unit && <span className="text-white/25"> · PU {r.polling_unit}</span>}
                    </div>
                    <p className="text-[12px] text-white/65 leading-relaxed mb-2">{r.description}</p>
                    {r.field_agents && (
                      <div className="text-[9px] text-white/25 mb-2">
                        Agent: {r.field_agents.name} · {r.field_agents.phone}
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      {(r.severity === 'critical' || r.severity === 'high') && r.status === 'open' && (
                        <button
                          onClick={() => resolve(r.id)}
                          className="btn-red text-[10px] px-2.5 py-1"
                        >
                          Escalate to Legal
                        </button>
                      )}
                      {r.status === 'open' && (
                        <button
                          onClick={() => resolve(r.id)}
                          className="btn-ghost text-[10px] px-2.5 py-1"
                        >
                          Mark Resolved
                        </button>
                      )}
                      {r.status !== 'open' && (
                        <span className="pill pill-green">Resolved</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
