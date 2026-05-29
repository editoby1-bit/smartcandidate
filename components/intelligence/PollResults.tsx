'use client'
// components/intelligence/PollResults.tsx
import { useState, useEffect } from 'react'
import type { Poll, PollResults as PollResultsType } from '@/types'

interface Props {
  polls: Poll[]
  candidateId: string
}

export default function PollResults({ polls, candidateId }: Props) {
  const [selected, setSelected] = useState<Poll | null>(polls[0] ?? null)
  const [results, setResults]   = useState<PollResultsType | null>(null)
  const [loading, setLoading]   = useState(false)
  const [newQ, setNewQ]         = useState('')
  const [newOpts, setNewOpts]   = useState(['Strongly support', 'Leaning support', 'Undecided', 'Opposed'])
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (!selected) return
    setLoading(true)
    fetch(`/api/polls/${selected.id}/results`)
      .then(r => r.json())
      .then(d => setResults(d))
      .catch(() => setResults(null))
      .finally(() => setLoading(false))
  }, [selected])

  async function createPoll() {
    if (!newQ.trim()) return
    setCreating(true)
    await fetch('/api/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: newQ,
        options: newOpts.filter(Boolean).map((l, i) => ({ key: String(i + 1), label: l })),
      }),
    })
    setCreating(false)
    setShowForm(false)
    setNewQ('')
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">
            Live Polls
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="btn-ghost text-[10px] px-2.5 py-1"
          >
            {showForm ? 'Cancel' : '+ New Poll'}
          </button>
        </div>

        {/* Poll selector */}
        {polls.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-3">
            {polls.map(p => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  selected?.id === p.id
                    ? 'bg-[#C9A84C] text-black'
                    : 'bg-[#1A1A1A] text-white/40 border border-white/8 hover:border-white/20'
                }`}
              >
                #{polls.indexOf(p) + 1}
              </button>
            ))}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <div className="bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] rounded-lg p-3 mb-3 space-y-2">
            <input
              className="sc-input text-[12px]"
              placeholder="Poll question…"
              value={newQ}
              onChange={e => setNewQ(e.target.value)}
            />
            {newOpts.map((opt, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-[10px] text-white/30 font-mono w-4">{i + 1}</span>
                <input
                  className="sc-input text-[11px] flex-1"
                  value={opt}
                  onChange={e => {
                    const next = [...newOpts]; next[i] = e.target.value; setNewOpts(next)
                  }}
                />
              </div>
            ))}
            <button
              onClick={createPoll}
              disabled={creating || !newQ.trim()}
              className="btn-gold text-[11px] px-3 py-1.5 w-full"
            >
              {creating ? 'Creating…' : 'Create Poll →'}
            </button>
          </div>
        )}

        {/* Poll question */}
        {selected ? (
          <>
            <div className="bg-[#1A1A1A] rounded-lg p-3 mb-3 text-[13px] text-white font-medium leading-snug border border-[rgba(201,168,76,0.1)]">
              {selected.question}
            </div>

            {loading ? (
              <div className="text-center py-6 text-white/25 text-sm">Loading results…</div>
            ) : results ? (
              <>
                {/* Options with bars */}
                <div className="space-y-2 mb-3">
                  {results.options.map(opt => (
                    <div key={opt.key} className="relative">
                      <div
                        className="absolute inset-0 rounded-lg"
                        style={{ background: `rgba(201,168,76,0.08)`, width: `${opt.pct}%` }}
                      />
                      <div className="relative flex items-center justify-between px-3 py-2.5 border border-[rgba(201,168,76,0.12)] rounded-lg">
                        <span className="text-[12px] text-white/80">{opt.key}. {opt.label}</span>
                        <span className="text-[11px] font-bold font-mono text-[#C9A84C]">{opt.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-white/25 font-mono">
                  <span>{results.totalResponses.toLocaleString()} total responses</span>
                  <span className={`pill ${selected.status === 'active' ? 'pill-green' : 'pill-grey'}`}>
                    {selected.status}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-white/25 text-sm">No responses yet</div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-white/25 text-sm">
            No polls created yet. Create your first poll above.
          </div>
        )}
      </div>
    </div>
  )
}
