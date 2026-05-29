'use client'
// components/field/AgentStatus.tsx
import type { FieldAgent } from '@/types'
import { formatDistanceToNow } from 'date-fns'

interface Props { agents: FieldAgent[] }

export function AgentStatus({ agents }: Props) {
  function getStatus(agent: FieldAgent): 'online' | 'warn' | 'offline' {
    if (!agent.last_checkin_at) return 'offline'
    const mins = (Date.now() - new Date(agent.last_checkin_at).getTime()) / 60000
    if (mins < 30) return 'online'
    if (mins < 90) return 'warn'
    return 'offline'
  }

  const online  = agents.filter(a => getStatus(a) === 'online').length
  const warning = agents.filter(a => getStatus(a) === 'warn').length
  const offline = agents.filter(a => getStatus(a) === 'offline').length

  return (
    <div className="card">
      <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
        Field Agents
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Active',  count: online,  color: '#1D9E75' },
          { label: 'No reply',count: warning, color: '#C9A84C' },
          { label: 'Offline', count: offline, color: '#D85A30' },
        ].map(s => (
          <div key={s.label} className="text-center p-2 bg-[#1A1A1A] rounded-lg border border-white/6">
            <div className="font-serif text-xl font-bold" style={{ color: s.color }}>{s.count}</div>
            <div className="text-[9px] text-white/30 uppercase tracking-wide">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {agents.length === 0 ? (
          <div className="text-center py-4 text-white/25 text-sm">No agents assigned</div>
        ) : (
          agents.map(a => {
            const s = getStatus(a)
            return (
              <div key={a.id} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  s === 'online' ? 'bg-[#1D9E75] pulse-dot' :
                  s === 'warn'   ? 'bg-[#C9A84C]' : 'bg-[#D85A30]/50'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-white/80 truncate">{a.name}</div>
                  <div className="text-[9px] text-white/25">
                    {a.assigned_ward ?? a.assigned_lga ?? 'Unassigned'}
                  </div>
                </div>
                <div className="text-[9px] text-white/25 font-mono flex-shrink-0">
                  {a.last_checkin_at
                    ? formatDistanceToNow(new Date(a.last_checkin_at), { addSuffix: true })
                    : 'Never'}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

export default AgentStatus
