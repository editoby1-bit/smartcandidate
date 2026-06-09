'use client'
// app/field-agent/page.tsx
// Field Agent PWA — mobile-first, works offline
// Agents open this URL on their phone, log in with agent code, submit reports

import { useState, useEffect } from 'react'
import { MapPin, AlertTriangle, CheckCircle, Send, RefreshCw, Wifi, WifiOff } from 'lucide-react'

interface AgentSession {
  id: string
  name: string
  agent_code: string
  assigned_ward: string | null
  assigned_lga: string | null
  candidate_id: string
}

interface QueuedReport {
  id: string
  type: string
  severity: string
  description: string
  ward: string
  lga: string
  timestamp: string
  synced: boolean
}

const REPORT_TYPES = [
  { value: 'positive',          label: '✅ All Good',           severity: 'low' },
  { value: 'high_turnout',      label: '📈 High Turnout',       severity: 'low' },
  { value: 'low_turnout',       label: '📉 Low Turnout',        severity: 'medium' },
  { value: 'late_opening',      label: '⏰ Late Opening',       severity: 'medium' },
  { value: 'bvas_fault',        label: '⚙️ BVAS Fault',        severity: 'high' },
  { value: 'ballot_box_issue',  label: '📦 Ballot Box Issue',  severity: 'high' },
  { value: 'intimidation',      label: '⚠️ Intimidation',      severity: 'high' },
  { value: 'violence',          label: '🚨 Violence',           severity: 'critical' },
  { value: 'result_capture',    label: '📋 Result Sheet',       severity: 'low' },
  { value: 'general',           label: '📝 General Note',       severity: 'low' },
]

export default function FieldAgentPage() {
  const [step, setStep]           = useState<'login' | 'dashboard' | 'report'>('login')
  const [agentCode, setAgentCode] = useState('')
  const [agent, setAgent]         = useState<AgentSession | null>(null)
  const [loginError, setLoginError] = useState('')
  const [logging, setLogging]     = useState(false)
  const [online, setOnline]       = useState(true)
  const [queue, setQueue]         = useState<QueuedReport[]>([])
  const [syncing, setSyncing]     = useState(false)

  // Report form
  const [reportType, setReportType]   = useState('positive')
  const [description, setDescription] = useState('')
  const [pollingUnit, setPollingUnit] = useState('')
  const [candidateV, setCandidateV]   = useState('')
  const [opponentV, setOpponentV]     = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [submitted, setSubmitted]     = useState(false)

  useEffect(() => {
    // Check online status
    setOnline(navigator.onLine)
    window.addEventListener('online',  () => setOnline(true))
    window.addEventListener('offline', () => setOnline(false))

    // Load queued reports from localStorage
    try {
      const saved = localStorage.getItem('sc_queue')
      if (saved) setQueue(JSON.parse(saved))
    } catch {}

    // Check saved session
    try {
      const saved = localStorage.getItem('sc_agent')
      if (saved) { setAgent(JSON.parse(saved)); setStep('dashboard') }
    } catch {}
  }, [])

  function saveQueue(q: QueuedReport[]) {
    setQueue(q)
    try { localStorage.setItem('sc_queue', JSON.stringify(q)) } catch {}
  }

  async function handleLogin() {
    if (!agentCode.trim()) return
    setLogging(true)
    setLoginError('')

    try {
      const res = await fetch(`/api/field-agent/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_code: agentCode.trim().toUpperCase() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setLoginError(data.error ?? 'Invalid agent code')
      } else {
        setAgent(data.agent)
        try { localStorage.setItem('sc_agent', JSON.stringify(data.agent)) } catch {}
        setStep('dashboard')
      }
    } catch {
      // Offline mode — check if we have a saved session
      const saved = localStorage.getItem('sc_agent')
      if (saved) {
        setAgent(JSON.parse(saved))
        setStep('dashboard')
      } else {
        setLoginError('No internet connection. Cannot verify agent code offline.')
      }
    }
    setLogging(false)
  }

  async function handleCheckin() {
    if (!agent) return
    try {
      await fetch('/api/field-agent/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agent.id }),
      })
    } catch {}
    alert('✓ Check-in recorded')
  }

  async function handleSubmitReport() {
    if (!agent || !description.trim()) return
    setSubmitting(true)

    const selectedType = REPORT_TYPES.find(t => t.value === reportType)
    const report: QueuedReport = {
      id:          Date.now().toString(),
      type:        reportType,
      severity:    selectedType?.severity ?? 'low',
      description: description.trim(),
      ward:        agent.assigned_ward  ?? 'Unknown',
      lga:         agent.assigned_lga   ?? 'Unknown',
      timestamp:   new Date().toISOString(),
      synced:      false,
    }

    if (online) {
      try {
        await fetch('/api/field-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_id:     agent.id,
            candidate_id: agent.candidate_id,
            ward:         report.ward,
            lga:          report.lga,
            state:        'Lagos',
            polling_unit: pollingUnit || null,
            report_type:  reportType,
            severity:     report.severity,
            description:  report.description,
            ...(reportType === 'result_capture' && {
              candidate_votes: parseInt(candidateV) || 0,
              opponent_votes:  parseInt(opponentV) || 0,
            }),
          }),
        })
        report.synced = true
      } catch {
        report.synced = false
      }
    }

    saveQueue([report, ...queue])
    setSubmitted(true)
    setDescription('')
    setPollingUnit('')
    setCandidateV('')
    setOpponentV('')
    setTimeout(() => { setSubmitted(false); setStep('dashboard') }, 1800)
    setSubmitting(false)
  }

  async function syncQueue() {
    if (!online || !agent) return
    setSyncing(true)
    const unsynced = queue.filter(r => !r.synced)
    for (const r of unsynced) {
      try {
        await fetch('/api/field-reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_id: agent.id, candidate_id: agent.candidate_id,
            ward: r.ward, lga: r.lga, state: 'Lagos',
            report_type: r.type, severity: r.severity, description: r.description,
          }),
        })
        r.synced = true
      } catch {}
    }
    saveQueue([...queue])
    setSyncing(false)
  }

  const unsynced = queue.filter(r => !r.synced).length

  // ── Login screen ───────────────────────────────────────────
  if (step === 'login') return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-xs">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[#C9A84C] shadow-[0_0_8px_#C9A84C]" />
            <span className="font-serif font-black text-lg text-[#C9A84C]">SmartCandidate</span>
          </div>
          <div className="text-white/40 text-sm">Field Agent Portal</div>
        </div>

        <div className="bg-[#141414] border border-[rgba(201,168,76,0.18)] rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-[9px] text-[#C9A84C]/70 uppercase tracking-widest mb-2">Agent Code</label>
            <input
              className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-3 text-base outline-none focus:border-[rgba(201,168,76,0.55)] uppercase tracking-widest text-center font-mono text-lg"
              placeholder="e.g. AGT-001"
              value={agentCode}
              onChange={e => setAgentCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoCapitalize="characters"
            />
          </div>
          {loginError && (
            <div className="text-[#D85A30] text-[12px] bg-[#D85A30]/10 border border-[#D85A30]/30 rounded-lg p-3 text-center">
              {loginError}
            </div>
          )}
          <button
            onClick={handleLogin}
            disabled={logging || !agentCode.trim()}
            className="w-full bg-[#C9A84C] text-black font-bold py-3 rounded-lg text-base hover:bg-[#F2D98A] disabled:opacity-50 transition-all"
          >
            {logging ? 'Verifying…' : 'Enter Portal →'}
          </button>
        </div>
        <div className={`flex items-center justify-center gap-1.5 mt-4 text-[11px] ${online ? 'text-[#1D9E75]' : 'text-[#D85A30]'}`}>
          {online ? <Wifi size={12} /> : <WifiOff size={12} />}
          {online ? 'Connected' : 'Offline mode'}
        </div>
      </div>
    </div>
  )

  // ── Dashboard screen ───────────────────────────────────────
  if (step === 'dashboard') return (
    <div className="min-h-screen bg-[#080808] p-4 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="text-[#C9A84C] font-serif font-black text-lg">SmartCandidate</div>
          <div className="text-white/50 text-[12px]">Field Agent · {agent?.name}</div>
        </div>
        <div className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${online ? 'text-[#1D9E75] border-[#1D9E75]/30 bg-[#1D9E75]/10' : 'text-[#D85A30] border-[#D85A30]/30 bg-[#D85A30]/10'}`}>
          {online ? <Wifi size={10} /> : <WifiOff size={10} />}
          {online ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Assignment */}
      <div className="bg-[#141414] border border-[rgba(201,168,76,0.18)] rounded-xl p-4 mb-4">
        <div className="text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">Your Assignment</div>
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={14} className="text-[#C9A84C]" />
          <span className="font-bold text-white text-[15px]">{agent?.assigned_ward ?? 'Not assigned'}</span>
        </div>
        <div className="text-[12px] text-white/40">{agent?.assigned_lga} · Code: {agent?.agent_code}</div>
      </div>

      {/* Unsynced warning */}
      {unsynced > 0 && (
        <div className="bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl p-3 mb-4 flex items-center justify-between">
          <div className="text-[12px] text-[#F2D98A] font-semibold">{unsynced} report{unsynced > 1 ? 's' : ''} waiting to sync</div>
          <button onClick={syncQueue} disabled={!online || syncing} className="text-[10px] font-bold bg-[#C9A84C] text-black px-3 py-1.5 rounded-lg disabled:opacity-50">
            {syncing ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => setStep('report')}
          className="w-full bg-[#C9A84C] text-black font-bold text-base py-4 rounded-xl hover:bg-[#F2D98A] transition-all flex items-center justify-center gap-2"
        >
          <Send size={16} />
          Submit Field Report
        </button>
        <button
          onClick={handleCheckin}
          className="w-full bg-transparent border border-[#1D9E75]/40 text-[#1D9E75] font-bold text-sm py-3 rounded-xl hover:bg-[#1D9E75]/10 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle size={14} />
          Check In — Confirm Presence
        </button>
        <button
          onClick={() => { localStorage.removeItem('sc_agent'); setAgent(null); setStep('login') }}
          className="w-full bg-transparent border border-white/10 text-white/35 font-semibold text-sm py-3 rounded-xl hover:bg-white/5 transition-all"
        >
          Sign Out
        </button>
      </div>

      {/* Recent reports */}
      {queue.length > 0 && (
        <div>
          <div className="text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-2">Your Recent Reports</div>
          <div className="space-y-2">
            {queue.slice(0, 5).map(r => (
              <div key={r.id} className="bg-[#141414] border border-white/8 rounded-lg p-3 flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${r.synced ? 'bg-[#1D9E75]' : 'bg-[#C9A84C]'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-semibold text-white capitalize">{r.type.replace(/_/g,' ')}</div>
                  <div className="text-[10px] text-white/30 truncate">{r.description.substring(0, 50)}</div>
                </div>
                <div className="text-[9px] text-white/25 font-mono flex-shrink-0">
                  {r.synced ? '✓ Synced' : '⏳ Queued'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  // ── Report screen ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#080808] p-4 max-w-md mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setStep('dashboard')} className="text-[#C9A84C] text-sm font-semibold">← Back</button>
        <div className="text-white font-bold text-lg">Submit Report</div>
      </div>

      {submitted ? (
        <div className="text-center py-16">
          <CheckCircle size={48} className="text-[#1D9E75] mx-auto mb-3" />
          <div className="text-white font-bold text-lg mb-1">Report Submitted</div>
          <div className="text-white/40 text-sm">{online ? 'Sent to HQ' : 'Saved — will sync when online'}</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Report type */}
          <div>
            <div className="text-[9px] text-[#C9A84C]/70 uppercase tracking-widest mb-2">Report Type</div>
            <div className="grid grid-cols-2 gap-2">
              {REPORT_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setReportType(t.value)}
                  className={`text-[12px] font-semibold py-3 px-3 rounded-xl border text-left transition-all ${
                    reportType === t.value
                      ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#F2D98A]'
                      : 'border-white/10 bg-[#141414] text-white/60 hover:border-white/25'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Polling unit */}
          <div>
            <div className="text-[9px] text-[#C9A84C]/70 uppercase tracking-widest mb-2">Polling Unit (optional)</div>
            <input
              className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-xl px-4 py-3 text-sm outline-none focus:border-[rgba(201,168,76,0.55)]"
              placeholder="e.g. PU-001 Ayobo Primary School"
              value={pollingUnit}
              onChange={e => setPollingUnit(e.target.value)}
            />
          </div>

          {/* Result capture fields */}
          {reportType === 'result_capture' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-[9px] text-[#C9A84C]/70 uppercase tracking-widest mb-2">Candidate Votes</div>
                <input type="number" className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-xl px-4 py-3 text-base outline-none focus:border-[rgba(201,168,76,0.55)] font-mono" placeholder="0" value={candidateV} onChange={e => setCandidateV(e.target.value)} />
              </div>
              <div>
                <div className="text-[9px] text-[#C9A84C]/70 uppercase tracking-widest mb-2">Opponent Votes</div>
                <input type="number" className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-xl px-4 py-3 text-base outline-none focus:border-[rgba(201,168,76,0.55)] font-mono" placeholder="0" value={opponentV} onChange={e => setOpponentV(e.target.value)} />
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <div className="text-[9px] text-[#C9A84C]/70 uppercase tracking-widest mb-2">Description *</div>
            <textarea
              className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-xl px-4 py-3 text-sm outline-none focus:border-[rgba(201,168,76,0.55)] resize-none min-h-[120px] leading-relaxed"
              placeholder="Describe what you are observing…"
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <button
            onClick={handleSubmitReport}
            disabled={submitting || !description.trim()}
            className="w-full bg-[#C9A84C] text-black font-bold text-base py-4 rounded-xl hover:bg-[#F2D98A] disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Send size={16} />
            {submitting ? 'Submitting…' : online ? 'Submit Report →' : 'Save Offline →'}
          </button>

          {!online && (
            <div className="text-center text-[11px] text-[#C9A84C]/60">
              You are offline — report will be saved and sent when you reconnect
            </div>
          )}
        </div>
      )}
    </div>
  )
}
