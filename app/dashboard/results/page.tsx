'use client'
// app/dashboard/results/page.tsx
import { useState, useEffect } from 'react'
import { RefreshCw, CheckCircle } from 'lucide-react'

interface ResultCapture {
  id: string
  polling_unit: string
  ward: string
  lga: string
  candidate_votes: number
  opponent_votes: number | null
  void_votes: number
  total_accredited: number | null
  verified: boolean
  submitted_at: string
  result_sheet_url: string | null
  field_agents?: { name: string } | null
}

export default function ResultCapturePage() {
  const [results, setResults]   = useState<ResultCapture[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('')
  const [autoRefresh, setAuto]  = useState(false)

  useEffect(() => { loadResults() }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const t = setInterval(loadResults, 30000)
    return () => clearInterval(t)
  }, [autoRefresh])

  async function loadResults() {
    setLoading(true)
    const res = await fetch('/api/result-captures')
    const data = await res.json()
    setResults(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  async function toggleVerify(id: string, current: boolean) {
    await fetch(`/api/result-captures/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ verified: !current })
    })
    loadResults()
  }

  const filtered = filter
    ? results.filter(r => r.lga.toLowerCase().includes(filter.toLowerCase()) || r.ward.toLowerCase().includes(filter.toLowerCase()) || r.polling_unit.toLowerCase().includes(filter.toLowerCase()))
    : results

  // Aggregates
  const totalCandVotes = results.reduce((s, r) => s + r.candidate_votes, 0)
  const totalOppVotes  = results.reduce((s, r) => s + (r.opponent_votes ?? 0), 0)
  const totalVotes     = totalCandVotes + totalOppVotes
  const candPct        = totalVotes > 0 ? Math.round((totalCandVotes / totalVotes) * 100) : 0
  const verified       = results.filter(r => r.verified).length
  const lgas           = new Set(results.map(r => r.lga)).size

  return (
    <div className="max-w-[1200px] space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Field Operations</div>
          <h1 className="font-serif text-3xl font-black text-white">Result <span className="text-[#C9A84C]">Aggregation</span></h1>
          <p className="text-sm text-white/40 mt-1">Independent collation from field agents. Updated before INEC.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => setAuto(v => !v)} className={`w-9 h-5 rounded-full transition-colors relative ${autoRefresh ? 'bg-[#1D9E75]' : 'bg-white/15'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${autoRefresh ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-[11px] text-white/50">Auto-refresh</span>
          </label>
          <button onClick={loadResults} className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Polling Units',    value: results.length,                          color: '#C9A84C' },
          { label: 'LGAs Reporting',  value: lgas,                                    color: '#4A90D9' },
          { label: 'Our Votes',        value: totalCandVotes.toLocaleString(),          color: '#1D9E75' },
          { label: 'Our Lead',         value: totalVotes > 0 ? `${candPct}%` : '—',   color: candPct > 50 ? '#1D9E75' : '#D85A30' },
          { label: 'Verified',         value: `${verified}/${results.length}`,         color: '#F2D98A' },
        ].map(c => (
          <div key={c.label} className="card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${c.color}, transparent)` }} />
            <div className="text-[9px] uppercase tracking-widest text-white/35 mb-1">{c.label}</div>
            <div className="font-serif text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Vote bar */}
      {totalVotes > 0 && (
        <div className="card">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">Running Total — Independent of INEC</div>
          <div className="flex h-8 rounded-xl overflow-hidden gap-0.5 mb-2">
            <div className="h-full bg-[#1D9E75] flex items-center justify-center text-[11px] font-bold text-white transition-all" style={{ width: `${candPct}%` }}>
              {candPct > 10 && `${candPct}%`}
            </div>
            <div className="h-full bg-[#D85A30] flex items-center justify-center text-[11px] font-bold text-white transition-all" style={{ width: `${100 - candPct}%` }}>
              {100 - candPct > 10 && `${100 - candPct}%`}
            </div>
          </div>
          <div className="flex justify-between text-[11px]">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-[#1D9E75]" /><span className="text-white/60">Our candidate: <strong className="text-white">{totalCandVotes.toLocaleString()}</strong></span></div>
            <div className="flex items-center gap-2"><span className="text-white/60">Opponent: <strong className="text-white">{totalOppVotes.toLocaleString()}</strong></span><div className="w-3 h-3 rounded-sm bg-[#D85A30]" /></div>
          </div>
          <div className="text-center text-[10px] text-white/25 mt-2 font-mono">
            {results.length} of {results.length} reporting PUs · Auto-updated from field agents
          </div>
        </div>
      )}

      {/* Filter + table */}
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">Polling Unit Results</div>
          <input
            className="ml-auto bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[rgba(201,168,76,0.45)] placeholder:text-white/20 w-48"
            placeholder="Filter by LGA, ward, PU…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
          />
        </div>

        {loading && results.length === 0 ? (
          <div className="text-center py-8 text-white/25 text-sm">Loading…</div>
        ) : results.length === 0 ? (
          <div className="text-center py-12 text-white/25">
            <div className="text-sm mb-1">No results submitted yet</div>
            <div className="text-[11px]">Field agents submit results via the Field Agent portal at <span className="text-[#C9A84C]/60">/field-agent</span></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-[rgba(201,168,76,0.08)]">
                  {['Polling Unit','LGA / Ward','Our Votes','Opponent','Void','Accredited','Lead','Verified'].map(h => (
                    <th key={h} className="text-left pb-2 text-[8px] uppercase tracking-widest text-white/25 font-semibold pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const total = r.candidate_votes + (r.opponent_votes ?? 0)
                  const lead  = total > 0 ? r.candidate_votes - (r.opponent_votes ?? 0) : 0
                  const pct   = total > 0 ? Math.round((r.candidate_votes / total) * 100) : 0
                  return (
                    <tr key={r.id} className="border-b border-[rgba(201,168,76,0.05)] hover:bg-white/[0.015]">
                      <td className="py-2.5 pr-3 font-mono text-[10px] text-[#F2D98A]">{r.polling_unit}</td>
                      <td className="py-2.5 pr-3">
                        <div className="text-white/70">{r.lga}</div>
                        <div className="text-[9px] text-white/30">{r.ward}</div>
                      </td>
                      <td className="py-2.5 pr-3 font-bold text-[#1D9E75]">{r.candidate_votes.toLocaleString()}</td>
                      <td className="py-2.5 pr-3 text-[#D85A30]">{r.opponent_votes?.toLocaleString() ?? '—'}</td>
                      <td className="py-2.5 pr-3 text-white/40">{r.void_votes}</td>
                      <td className="py-2.5 pr-3 text-white/40">{r.total_accredited?.toLocaleString() ?? '—'}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`font-bold font-mono text-[11px] ${lead > 0 ? 'text-[#1D9E75]' : lead < 0 ? 'text-[#D85A30]' : 'text-white/30'}`}>
                          {lead > 0 ? '+' : ''}{lead} ({pct}%)
                        </span>
                      </td>
                      <td className="py-2.5">
                        <button onClick={() => toggleVerify(r.id, r.verified)} className={`transition-colors ${r.verified ? 'text-[#1D9E75]' : 'text-white/20 hover:text-white/50'}`}>
                          <CheckCircle size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
