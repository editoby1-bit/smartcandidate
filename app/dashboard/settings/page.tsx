'use client'
// app/dashboard/settings/page.tsx
// Candidate management — edit details, add new candidates, switch active candidate

import { useState, useEffect } from 'react'
import { Save, Plus, Check, RefreshCw } from 'lucide-react'

interface Candidate {
  id: string
  name: string
  party: string | null
  position: string
  state: string
  lga: string | null
  election_date: string | null
  election_type: string
  color: string
  active: boolean
}

const ELECTION_TYPES = [
  'gubernatorial', 'senatorial', 'house_of_reps',
  'house_of_assembly', 'presidential', 'local_government'
]

const PARTIES = ['APC', 'PDP', 'LP', 'NNPP', 'APGA', 'SDP', 'ADC', 'YPP', 'Other']

export default function SettingsPage() {
  const [candidate, setCandidate]   = useState<Candidate | null>(null)
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [error, setError]           = useState('')
  const [allCandidates, setAll]     = useState<Candidate[]>([])
  const [showAdd, setShowAdd]       = useState(false)
  const [newCand, setNewCand]       = useState({
    name: '', party: 'APC', position: 'Governor',
    state: 'Lagos', election_date: '', election_type: 'gubernatorial', color: '#C9A84C'
  })
  const [adding, setAdding]         = useState(false)

  useEffect(() => { loadCandidate() }, [])

  async function loadCandidate() {
    const res  = await fetch('/api/candidate')
    const data = await res.json()
    if (data.candidate)   setCandidate(data.candidate)
    if (data.all)         setAll(data.all)
  }

  async function handleSave() {
    if (!candidate) return
    setSaving(true)
    setError('')
    const res = await fetch('/api/candidate', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Save failed')
    else { setSaved(true); setTimeout(() => setSaved(false), 2500) }
    setSaving(false)
  }

  async function handleAdd() {
    setAdding(true)
    setError('')
    const res = await fetch('/api/candidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCand),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Failed to create candidate')
    else {
      setShowAdd(false)
      setNewCand({ name: '', party: 'APC', position: 'Governor', state: 'Lagos', election_date: '', election_type: 'gubernatorial', color: '#C9A84C' })
      loadCandidate()
    }
    setAdding(false)
  }

  async function switchCandidate(id: string) {
    await fetch('/api/candidate/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_id: id }),
    })
    window.location.reload()
  }

  if (!candidate) return (
    <div className="flex items-center justify-center h-64 text-white/30">Loading…</div>
  )

  return (
    <div className="max-w-[800px] space-y-5">
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Settings</div>
        <h1 className="font-serif text-3xl font-black text-white">
          Candidate <span className="text-[#C9A84C]">Settings</span>
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Edit your candidate's details. Changes appear immediately across the platform.
        </p>
      </div>

      {/* Current candidate editor */}
      <div className="card">
        <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-4">
          Current Candidate
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">
              Full Name
            </label>
            <input
              className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none focus:border-[rgba(201,168,76,0.55)]"
              value={candidate.name}
              onChange={e => setCandidate({ ...candidate, name: e.target.value })}
              placeholder="e.g. Gov. Babajide Sanwo-Olu"
            />
          </div>
          <div>
            <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">
              Party
            </label>
            <select
              className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none"
              value={candidate.party ?? ''}
              onChange={e => setCandidate({ ...candidate, party: e.target.value })}
            >
              {PARTIES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">
              Position
            </label>
            <input
              className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none focus:border-[rgba(201,168,76,0.55)]"
              value={candidate.position}
              onChange={e => setCandidate({ ...candidate, position: e.target.value })}
              placeholder="e.g. Governor, Senator, House of Reps"
            />
          </div>
          <div>
            <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">
              State
            </label>
            <input
              className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none focus:border-[rgba(201,168,76,0.55)]"
              value={candidate.state}
              onChange={e => setCandidate({ ...candidate, state: e.target.value })}
              placeholder="e.g. Lagos"
            />
          </div>
          <div>
            <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">
              Election Date
            </label>
            <input
              type="date"
              className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none focus:border-[rgba(201,168,76,0.55)]"
              value={candidate.election_date ?? ''}
              onChange={e => setCandidate({ ...candidate, election_date: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">
              Election Type
            </label>
            <select
              className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none"
              value={candidate.election_type}
              onChange={e => setCandidate({ ...candidate, election_type: e.target.value })}
            >
              {ELECTION_TYPES.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">
              Brand Colour
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                className="w-10 h-9 rounded cursor-pointer bg-transparent border border-[rgba(201,168,76,0.18)]"
                value={candidate.color}
                onChange={e => setCandidate({ ...candidate, color: e.target.value })}
              />
              <input
                className="flex-1 bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none font-mono focus:border-[rgba(201,168,76,0.55)]"
                value={candidate.color}
                onChange={e => setCandidate({ ...candidate, color: e.target.value })}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 text-[12px] text-[#D85A30] bg-[#D85A30]/10 border border-[#D85A30]/30 rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end mt-4 pt-3 border-t border-[rgba(201,168,76,0.1)]">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#C9A84C] text-black font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-[#F2D98A] disabled:opacity-50 transition-all"
          >
            {saved ? <Check size={14} /> : <Save size={14} />}
            {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* All candidates / switcher */}
      {allCandidates.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">
              All Campaigns
            </div>
            <button
              onClick={() => setShowAdd(v => !v)}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-[#C9A84C] border border-[rgba(201,168,76,0.3)] px-3 py-1.5 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all"
            >
              <Plus size={12} />
              Add Candidate
            </button>
          </div>

          <div className="space-y-2">
            {allCandidates.map(c => (
              <div
                key={c.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  c.id === candidate.id
                    ? 'border-[rgba(201,168,76,0.4)] bg-[rgba(201,168,76,0.06)]'
                    : 'border-[rgba(255,255,255,0.07)] bg-[#1A1A1A] hover:border-[rgba(201,168,76,0.2)]'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: c.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white">{c.name}</div>
                  <div className="text-[10px] text-white/35">
                    {c.party} · {c.position} · {c.state}
                    {c.election_date && ` · ${new Date(c.election_date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                  </div>
                </div>
                {c.id === candidate.id ? (
                  <span className="text-[9px] font-bold text-[#1D9E75] bg-[#1D9E75]/10 border border-[#1D9E75]/30 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                ) : (
                  <button
                    onClick={() => switchCandidate(c.id)}
                    className="flex items-center gap-1.5 text-[10px] font-semibold text-white/50 hover:text-[#C9A84C] transition-colors"
                  >
                    <RefreshCw size={11} />
                    Switch
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add new candidate form */}
      {showAdd && (
        <div className="card border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.03)]">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-4">
            Add New Candidate / Campaign
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Full Name', key: 'name', placeholder: 'e.g. Sen. Chioma Okafor' },
              { label: 'Position', key: 'position', placeholder: 'e.g. Governor, Senator' },
              { label: 'State', key: 'state', placeholder: 'e.g. Rivers' },
              { label: 'Election Date', key: 'election_date', type: 'date' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">
                  {f.label}
                </label>
                <input
                  type={f.type ?? 'text'}
                  className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none focus:border-[rgba(201,168,76,0.55)]"
                  placeholder={f.placeholder}
                  value={(newCand as any)[f.key]}
                  onChange={e => setNewCand({ ...newCand, [f.key]: e.target.value })}
                />
              </div>
            ))}
            <div>
              <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Party</label>
              <select
                className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none"
                value={newCand.party}
                onChange={e => setNewCand({ ...newCand, party: e.target.value })}
              >
                {PARTIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Election Type</label>
              <select
                className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none"
                value={newCand.election_type}
                onChange={e => setNewCand({ ...newCand, election_type: e.target.value })}
              >
                {ELECTION_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleAdd}
              disabled={adding || !newCand.name.trim()}
              className="bg-[#C9A84C] text-black font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-[#F2D98A] disabled:opacity-50 transition-all"
            >
              {adding ? 'Creating…' : 'Create Candidate →'}
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="bg-transparent border border-white/15 text-white/50 text-sm px-4 py-2.5 rounded-lg hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
