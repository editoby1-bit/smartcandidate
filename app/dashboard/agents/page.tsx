'use client'
// app/dashboard/agents/page.tsx
import { useState, useEffect } from 'react'
import { Plus, Copy, CheckCircle } from 'lucide-react'
import type { FieldAgent } from '@/types'
import { formatDistanceToNow } from 'date-fns'

export default function AgentsPage() {
  const [agents, setAgents]     = useState<FieldAgent[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [copied, setCopied]     = useState<string | null>(null)
  const [form, setForm]         = useState({ name: '', phone: '', assigned_state: 'Lagos', assigned_lga: '', assigned_ward: '' })

  useEffect(() => { loadAgents() }, [])

  async function loadAgents() {
    setLoading(true)
    const res = await fetch('/api/field-agents')
    const data = await res.json()
    setAgents(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.name.trim() || !form.phone.trim()) return
    setSaving(true)
    await fetch('/api/field-agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setShowAdd(false)
    setForm({ name: '', phone: '', assigned_state: 'Lagos', assigned_lga: '', assigned_ward: '' })
    loadAgents()
    setSaving(false)
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  function getStatusColor(agent: FieldAgent) {
    if (!agent.last_checkin_at) return 'bg-white/20'
    const mins = (Date.now() - new Date(agent.last_checkin_at).getTime()) / 60000
    if (mins < 30) return 'bg-[#1D9E75] pulse-dot'
    if (mins < 90) return 'bg-[#C9A84C]'
    return 'bg-[#D85A30]'
  }

  const pwaUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/field-agent`
    : '/field-agent'

  return (
    <div className="max-w-[1000px] space-y-5">
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Field Operations</div>
        <h1 className="font-serif text-3xl font-black text-white">Field <span className="text-[#C9A84C]">Agents</span></h1>
        <p className="text-sm text-white/40 mt-1">Manage your election day ground team. Each agent gets a unique code to access the field portal.</p>
      </div>

      {/* PWA link */}
      <div className="card border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.04)]">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-2">Field Agent Portal URL</div>
        <p className="text-[12px] text-white/55 mb-3">Share this URL with your agents. Works on any phone browser — no app install needed. Works offline on election day.</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] rounded-lg px-3 py-2 font-mono text-[12px] text-[#F2D98A] truncate">{pwaUrl}</div>
          <button
            onClick={() => { navigator.clipboard.writeText(pwaUrl); setCopied('url') }}
            className="flex items-center gap-1.5 bg-[#C9A84C] text-black font-bold text-[11px] px-3 py-2 rounded-lg hover:bg-[#F2D98A] transition-all flex-shrink-0"
          >
            {copied === 'url' ? <CheckCircle size={12} /> : <Copy size={12} />}
            {copied === 'url' ? 'Copied!' : 'Copy URL'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Agents',   value: agents.length, color: '#C9A84C' },
          { label: 'Active Now',     value: agents.filter(a => a.last_checkin_at && (Date.now() - new Date(a.last_checkin_at).getTime()) < 1800000).length, color: '#1D9E75' },
          { label: 'No Check-in',    value: agents.filter(a => !a.last_checkin_at).length, color: '#D85A30' },
          { label: 'LGAs Covered',   value: new Set(agents.map(a => a.assigned_lga).filter(Boolean)).size, color: '#4A90D9' },
        ].map(c => (
          <div key={c.label} className="card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${c.color}, transparent)` }} />
            <div className="text-[9px] uppercase tracking-widest text-white/35 mb-1">{c.label}</div>
            <div className="font-serif text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Add agent */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">Agents</div>
          <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 text-[10px] font-semibold text-[#C9A84C] border border-[rgba(201,168,76,0.3)] px-3 py-1.5 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all">
            <Plus size={12} />{showAdd ? 'Cancel' : 'Add Agent'}
          </button>
        </div>

        {showAdd && (
          <div className="bg-[#1A1A1A] border border-[rgba(201,168,76,0.15)] rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Full Name *', key: 'name', placeholder: 'e.g. Emeka Obi' },
                { label: 'Phone *',     key: 'phone', placeholder: '0801 234 5678' },
                { label: 'LGA',         key: 'assigned_lga',  placeholder: 'e.g. Alimosho' },
                { label: 'Ward',        key: 'assigned_ward', placeholder: 'e.g. Ayobo/Ipaja I' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">{f.label}</label>
                  <input
                    className="w-full bg-[#141414] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none focus:border-[rgba(201,168,76,0.55)]"
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  />
                </div>
              ))}
            </div>
            <button onClick={handleAdd} disabled={saving || !form.name.trim() || !form.phone.trim()} className="bg-[#C9A84C] text-black font-bold text-sm px-4 py-2 rounded-lg hover:bg-[#F2D98A] disabled:opacity-50 transition-all">
              {saving ? 'Adding…' : 'Add Agent →'}
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-6 text-white/25">Loading…</div>
        ) : agents.length === 0 ? (
          <div className="text-center py-10 text-white/25">
            <div className="text-sm mb-1">No agents yet</div>
            <div className="text-[11px]">Add your first field agent above</div>
          </div>
        ) : (
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[rgba(201,168,76,0.08)]">
                {['Status','Name','Code','Assignment','Last Check-in','Actions'].map(h => (
                  <th key={h} className="text-left pb-2 text-[8px] uppercase tracking-widest text-white/25 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agents.map(a => (
                <tr key={a.id} className="border-b border-[rgba(201,168,76,0.05)] hover:bg-white/[0.015]">
                  <td className="py-3">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(a)}`} />
                  </td>
                  <td className="py-3">
                    <div className="font-semibold text-white">{a.name}</div>
                    <div className="text-[9px] text-white/30">{a.phone}</div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[#F2D98A] font-bold">{a.agent_code}</span>
                      <button onClick={() => copyCode(a.agent_code)} className="text-white/25 hover:text-[#C9A84C] transition-colors">
                        {copied === a.agent_code ? <CheckCircle size={11} className="text-[#1D9E75]" /> : <Copy size={11} />}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 text-white/50">
                    {a.assigned_ward ?? a.assigned_lga ?? '—'}
                  </td>
                  <td className="py-3 text-white/35 font-mono text-[10px]">
                    {a.last_checkin_at
                      ? formatDistanceToNow(new Date(a.last_checkin_at), { addSuffix: true })
                      : 'Never'}
                  </td>
                  <td className="py-3">
                    <button onClick={() => copyCode(`${pwaUrl} — Code: ${a.agent_code}`)} className="text-[9px] text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors border border-transparent hover:border-[rgba(201,168,76,0.2)] px-2 py-0.5 rounded">
                      Share
                    </button>
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
