'use client'
// app/dashboard/polls/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { Plus, BarChart3, Users, CheckCircle, RefreshCw } from 'lucide-react'

interface PollOption { key: string; label: string }
interface Poll {
  id: string; question: string; options: PollOption[]
  status: 'draft' | 'active' | 'closed'
  created_at: string; closed_at: string | null
}
interface PollResult {
  poll: Poll; totalResponses: number
  options: { key: string; label: string; count: number; pct: number }[]
  byLGA: { lga: string; breakdown: { key: string; count: number }[] }[]
}

const DEFAULT_OPTIONS = ['Strongly support', 'Leaning support', 'Undecided / Neutral', 'Opposed']

export default function PollsPage() {
  const [polls, setPolls]         = useState<Poll[]>([])
  const [selected, setSelected]   = useState<Poll | null>(null)
  const [results, setResults]     = useState<PollResult | null>(null)
  const [loading, setLoading]     = useState(true)
  const [loadingRes, setLoadingRes] = useState(false)
  const [showForm, setShowForm]   = useState(false)
  const [creating, setCreating]   = useState(false)
  const [question, setQuestion]   = useState('')
  const [options, setOptions]     = useState<string[]>(DEFAULT_OPTIONS)

  useEffect(() => { loadPolls() }, [])

  useEffect(() => {
    if (!selected) return
    loadResults(selected.id)
    // Auto-refresh results every 15s if poll is active
    if (selected.status === 'active') {
      const t = setInterval(() => loadResults(selected.id), 15000)
      return () => clearInterval(t)
    }
  }, [selected])

  async function loadPolls() {
    setLoading(true)
    const res = await fetch('/api/polls')
    const data = await res.json()
    const list = Array.isArray(data) ? data : []
    setPolls(list)
    if (list.length > 0 && !selected) setSelected(list[0])
    setLoading(false)
  }

  async function loadResults(pollId: string) {
    setLoadingRes(true)
    const res = await fetch(`/api/polls/${pollId}/results`)
    if (res.ok) setResults(await res.json())
    setLoadingRes(false)
  }

  async function createPoll() {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) return
    setCreating(true)
    const res = await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: question.trim(),
        options: options.filter(o => o.trim()).map((l, i) => ({ key: String(i + 1), label: l.trim() }))
      })
    })
    const data = await res.json()
    setShowForm(false)
    setQuestion('')
    setOptions(DEFAULT_OPTIONS)
    await loadPolls()
    if (data.id || data?.id) setSelected(data)
    setCreating(false)
  }

  async function updateStatus(pollId: string, status: 'active' | 'closed') {
    await fetch(`/api/polls/${pollId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    loadPolls()
  }

  const STATUS_STYLE: Record<string, string> = {
    active: 'pill-green', draft: 'pill-gold', closed: 'pill-grey'
  }

  return (
    <div className="max-w-[1200px] space-y-5">
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Engagement</div>
        <h1 className="font-serif text-3xl font-black text-white">Live <span className="text-[#C9A84C]">Polls</span></h1>
        <p className="text-sm text-white/40 mt-1">Send polls to voters via WhatsApp or SMS. See results in real time, broken down by LGA.</p>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-5">
        {/* Poll list */}
        <div className="space-y-3">
          <button
            onClick={() => setShowForm(v => !v)}
            className="w-full flex items-center justify-center gap-2 bg-[#C9A84C] text-black font-bold text-sm py-2.5 rounded-xl hover:bg-[#F2D98A] transition-all"
          >
            <Plus size={14} />{showForm ? 'Cancel' : 'Create New Poll'}
          </button>

          {/* Create form */}
          {showForm && (
            <div className="card space-y-3">
              <div>
                <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Question</label>
                <textarea
                  className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none focus:border-[rgba(201,168,76,0.55)] resize-none"
                  rows={3}
                  placeholder="Do you support Gov. Adeyemi's second term?"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Options (min 2)</label>
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] text-white/30 font-mono w-4 flex-shrink-0">{i + 1}</span>
                    <input
                      className="flex-1 bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-2.5 py-1.5 text-[12px] outline-none focus:border-[rgba(201,168,76,0.55)]"
                      value={opt}
                      onChange={e => { const n = [...options]; n[i] = e.target.value; setOptions(n) }}
                    />
                  </div>
                ))}
                {options.length < 4 && (
                  <button onClick={() => setOptions([...options, ''])} className="text-[10px] text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors mt-1">+ Add option</button>
                )}
              </div>
              <button
                onClick={createPoll}
                disabled={creating || !question.trim()}
                className="w-full bg-[#C9A84C] text-black font-bold text-[12px] py-2 rounded-lg disabled:opacity-50 hover:bg-[#F2D98A] transition-all"
              >
                {creating ? 'Creating…' : 'Create Poll →'}
              </button>
            </div>
          )}

          {/* Poll list */}
          {loading ? (
            <div className="text-center py-6 text-white/25 text-sm">Loading…</div>
          ) : polls.length === 0 ? (
            <div className="card text-center py-6 text-white/25 text-sm">No polls yet</div>
          ) : (
            <div className="space-y-2">
              {polls.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${
                    selected?.id === p.id
                      ? 'border-[rgba(201,168,76,0.4)] bg-[rgba(201,168,76,0.08)]'
                      : 'border-white/8 bg-[#141414] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="text-[12px] font-semibold text-white leading-snug flex-1">{p.question}</div>
                    <span className={`pill flex-shrink-0 ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                  </div>
                  <div className="text-[9px] text-white/25 font-mono">
                    {new Date(p.created_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results panel */}
        <div className="space-y-4">
          {!selected ? (
            <div className="card flex items-center justify-center h-48 text-white/25">
              <div className="text-center">
                <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
                <div className="text-sm">Select a poll to see results</div>
              </div>
            </div>
          ) : (
            <>
              {/* Poll header */}
              <div className="card">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">Poll Question</div>
                    <div className="text-[16px] font-bold text-white leading-snug">{selected.question}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => loadResults(selected.id)} className="w-7 h-7 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors">
                      <RefreshCw size={12} className={loadingRes ? 'animate-spin' : ''} />
                    </button>
                    {selected.status === 'draft' && (
                      <button onClick={() => updateStatus(selected.id, 'active')} className="bg-[#1D9E75] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-all">
                        Activate Poll →
                      </button>
                    )}
                    {selected.status === 'active' && (
                      <button onClick={() => updateStatus(selected.id, 'closed')} className="border border-[#D85A30]/40 text-[#D85A30] text-[11px] font-bold px-3 py-1.5 rounded-lg hover:bg-[#D85A30]/10 transition-all">
                        Close Poll
                      </button>
                    )}
                  </div>
                </div>

                {/* Results */}
                {!results || results.totalResponses === 0 ? (
                  <div className="text-center py-8 text-white/25">
                    <Users size={28} className="mx-auto mb-2 opacity-30" />
                    <div className="text-sm">No responses yet</div>
                    {selected.status === 'draft' && <div className="text-[11px] mt-1">Activate the poll and send it in a campaign to collect responses</div>}
                  </div>
                ) : (
                  <>
                    <div className="text-[10px] text-white/30 font-mono mb-3">{results.totalResponses.toLocaleString()} total responses</div>
                    <div className="space-y-2.5">
                      {results.options.map((opt, i) => {
                        const colors = ['#1D9E75','#C9A84C','#4A90D9','#D85A30']
                        const color = colors[i % colors.length]
                        const isTop = opt.count === Math.max(...results.options.map(o => o.count))
                        return (
                          <div key={opt.key} className={`relative rounded-xl border overflow-hidden ${isTop ? 'border-[rgba(201,168,76,0.3)]' : 'border-white/8'}`}>
                            <div className="absolute inset-0 rounded-xl opacity-10" style={{ background: color, width: `${opt.pct}%` }} />
                            <div className="relative flex items-center justify-between px-4 py-3">
                              <div className="flex items-center gap-2">
                                {isTop && results.totalResponses > 0 && <CheckCircle size={13} style={{ color }} />}
                                <span className="text-[13px] font-semibold text-white">{opt.key}. {opt.label}</span>
                              </div>
                              <span className="font-bold font-mono text-[14px]" style={{ color }}>{opt.pct}%</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* LGA breakdown */}
              {results && results.byLGA.length > 0 && (
                <div className="card">
                  <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">Results by LGA</div>
                  <div className="space-y-2">
                    {results.byLGA.slice(0, 10).map(lga => {
                      const total = lga.breakdown.reduce((s, b) => s + b.count, 0)
                      const top   = lga.breakdown.sort((a, b) => b.count - a.count)[0]
                      const topOpt = results.options.find(o => o.key === top?.key)
                      return (
                        <div key={lga.lga} className="flex items-center gap-3">
                          <div className="text-[11px] font-semibold text-white/70 w-28 flex-shrink-0 truncate">{lga.lga}</div>
                          <div className="flex-1 flex h-2 rounded-full overflow-hidden gap-px bg-white/5">
                            {lga.breakdown.map((b, i) => {
                              const colors = ['#1D9E75','#C9A84C','#4A90D9','#D85A30']
                              return total > 0 ? (
                                <div key={b.key} className="h-full" style={{ width: `${(b.count/total)*100}%`, background: colors[i % colors.length] }} />
                              ) : null
                            })}
                          </div>
                          <div className="text-[10px] text-white/35 w-20 text-right truncate">
                            {topOpt?.label ?? '—'} leads
                          </div>
                          <div className="text-[9px] text-white/25 font-mono w-10 text-right">{total}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* How to send */}
              {selected.status !== 'closed' && (
                <div className="card border-[rgba(201,168,76,0.15)] bg-[rgba(201,168,76,0.03)]">
                  <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-2">How to Collect Responses</div>
                  <div className="text-[12px] text-white/50 leading-relaxed space-y-1">
                    <div>1. <strong className="text-white/80">Activate</strong> the poll above</div>
                    <div>2. Go to <strong className="text-white/80">Broadcast</strong> → create a WhatsApp or SMS campaign</div>
                    <div>3. Include the poll question and ask voters to reply with 1, 2, 3, or 4</div>
                    <div>4. Inbound replies are automatically matched to this poll</div>
                    <div>5. Results update here in real time</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
