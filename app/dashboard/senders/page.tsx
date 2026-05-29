'use client'
// app/dashboard/senders/page.tsx
// WhatsApp session pool management
// Shows all sessions, capacity, ban status, and lets you add new sessions

import { useState, useEffect } from 'react'

interface Session {
  id: string
  label: string
  phone_number: string | null
  status: 'warming' | 'active' | 'banned' | 'disconnected' | 'setup'
  daily_limit: number
  sent_today: number
  capacity_used_pct: number
  warmup_day: number
  created_at: string
}

interface Stats {
  total: number
  active: number
  banned: number
  warming: number
  daily_capacity: number
  sent_today: number
}

const STATUS_STYLE: Record<string, string> = {
  active:       'pill-green',
  warming:      'pill-gold',
  banned:       'pill-red',
  disconnected: 'pill-red',
  setup:        'pill-grey',
}

export default function SendersPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [stats, setStats]       = useState<Stats | null>(null)
  const [loading, setLoading]   = useState(true)
  const [adding, setAdding]     = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [instructions, setInstructions] = useState<string[]>([])

  useEffect(() => { loadSessions() }, [])

  async function loadSessions() {
    setLoading(true)
    const res = await fetch('/api/wa-sessions')
    const data = await res.json()
    setSessions(data.sessions ?? [])
    setStats(data.stats ?? null)
    setLoading(false)
  }

  async function addSession() {
    setAdding(true)
    const res = await fetch('/api/wa-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: newLabel || undefined }),
    })
    const data = await res.json()
    setInstructions(data.instructions ?? [])
    setNewLabel('')
    setAdding(false)
    loadSessions()
  }

  const daysToFull = stats && stats.daily_capacity > 0
    ? null : null

  return (
    <div className="max-w-[1100px] space-y-5">
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">
          WhatsApp · Session Pool
        </div>
        <h1 className="font-serif text-3xl font-black text-white">
          Sender <span className="text-[#C9A84C]">Management</span>
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Each session = one WhatsApp number. More sessions = more daily capacity.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Sessions', value: stats.total, color: '#C9A84C' },
            { label: 'Active',         value: stats.active, color: '#1D9E75' },
            { label: 'Daily Capacity', value: stats.daily_capacity.toLocaleString() + '/day', color: '#4A90D9' },
            { label: 'Sent Today',     value: stats.sent_today.toLocaleString(), color: '#F2D98A' },
          ].map(c => (
            <div key={c.label} className="card relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${c.color}, transparent)` }} />
              <div className="text-[9px] uppercase tracking-widest text-white/35 mb-1">{c.label}</div>
              <div className="font-serif text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Capacity calculator */}
      {stats && (
        <div className="card bg-[#141414] border-[rgba(201,168,76,0.18)]">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
            Capacity Planning
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {[
              { label: 'To reach 100,000',  sessions: Math.ceil(100000 / 200) },
              { label: 'To reach 500,000',  sessions: Math.ceil(500000 / 200) },
              { label: 'To reach 1,000,000', sessions: Math.ceil(1000000 / 200) },
            ].map(c => (
              <div key={c.label} className="bg-[#1A1A1A] rounded-lg p-3 border border-white/6">
                <div className="text-white/50 text-[11px] mb-1">{c.label} in 1 day</div>
                <div className="font-bold text-[#F2D98A] font-serif text-lg">{c.sessions.toLocaleString()}</div>
                <div className="text-white/30 text-[10px]">WhatsApp sessions needed</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] text-white/40 leading-relaxed">
            Each warmed session sends ~200 messages/day. New sessions start at 50/day and grow 12% daily over 14 days.
            Current pool capacity: <span className="text-[#F2D98A] font-semibold">{stats.daily_capacity.toLocaleString()}/day</span>.
            {stats.daily_capacity < 10000 && (
              <span className="text-[#D85A30]"> Add more sessions to increase capacity.</span>
            )}
          </div>
        </div>
      )}

      {/* Add session */}
      <div className="card">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
          Add New WhatsApp Session
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">
              Session Label (optional)
            </label>
            <input
              className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none focus:border-[rgba(201,168,76,0.55)]"
              placeholder="e.g. mtn_line_001"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
            />
          </div>
          <button
            onClick={addSession}
            disabled={adding}
            className="bg-[#C9A84C] text-black font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#F2D98A] disabled:opacity-50"
          >
            {adding ? 'Adding…' : '+ Add Session'}
          </button>
        </div>

        {instructions.length > 0 && (
          <div className="mt-3 bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-lg p-3">
            <div className="text-[10px] font-bold text-[#1D9E75] uppercase tracking-widest mb-2">
              Next Steps
            </div>
            {instructions.map((line, i) => (
              <div key={i} className="text-[11px] text-white/70 leading-relaxed">{line}</div>
            ))}
          </div>
        )}
      </div>

      {/* Session list */}
      <div className="card">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
          All Sessions
        </div>
        {loading ? (
          <div className="text-center py-6 text-white/25">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-white/25 text-sm">
            No sessions yet. Add your first WhatsApp number above.
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[rgba(201,168,76,0.08)]">
                {['Session', 'Phone', 'Status', 'Sent Today', 'Daily Limit', 'Warmup Day', 'Capacity'].map(h => (
                  <th key={h} className="text-left pb-2 text-[8px] tracking-widest uppercase text-white/25 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} className="border-b border-[rgba(201,168,76,0.05)] hover:bg-white/[0.015]">
                  <td className="py-2.5 font-mono text-[#F2D98A] font-semibold">{s.label}</td>
                  <td className="py-2.5 text-white/50 font-mono">{s.phone_number ?? '—'}</td>
                  <td className="py-2.5">
                    <span className={`pill ${STATUS_STYLE[s.status] ?? 'pill-grey'}`}>{s.status}</span>
                  </td>
                  <td className="py-2.5 font-mono text-white/70">{s.sent_today}</td>
                  <td className="py-2.5 font-mono text-white/70">{s.daily_limit}</td>
                  <td className="py-2.5 text-white/50">
                    {s.warmup_day >= 14 ? '✓ Fully warmed' : `Day ${s.warmup_day}/14`}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/8 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${s.capacity_used_pct}%`,
                            background: s.capacity_used_pct > 80 ? '#D85A30' : '#1D9E75',
                          }}
                        />
                      </div>
                      <span className="text-white/40 text-[9px]">{s.capacity_used_pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
