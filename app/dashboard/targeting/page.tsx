'use client'
// app/dashboard/targeting/page.tsx
import { useState, useEffect } from 'react'
import { getLGAs, getWards, getStates } from '@/lib/utils/geography'
import { useRouter } from 'next/navigation'

interface WardData {
  ward: string
  lga: string
  state: string
  recipients_total: number
  recipients_reached: number
  reach_pct: number | null
  sentiment_score: number | null
  response_count: number
}

export default function TargetingPage() {
  const router = useRouter()
  const [selectedState, setSelectedState] = useState('Lagos')
  const [selectedLGA,   setSelectedLGA]   = useState('')
  const [selectedWard,  setSelectedWard]  = useState('')
  const [wardData,      setWardData]      = useState<WardData[]>([])
  const [loading,       setLoading]       = useState(false)
  const [totalNumbers,  setTotalNumbers]  = useState(0)
  const [metric,        setMetric]        = useState<'reach' | 'sentiment' | 'response'>('reach')

  const states = getStates()
  const lgas   = selectedState ? getLGAs(selectedState) : []
  const wards  = (selectedState && selectedLGA) ? getWards(selectedState, selectedLGA) : []

  // Load ward snapshots
  useEffect(() => {
    fetch('/api/analytics?type=wards')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setWardData(d))
  }, [])

  // Load recipient count when targeting changes
  useEffect(() => {
    if (!selectedState && !selectedLGA) { setTotalNumbers(0); return }
    const p = new URLSearchParams({ count: 'true' })
    if (selectedState) p.set('state', selectedState)
    if (selectedLGA)   p.set('lga', selectedLGA)
    if (selectedWard)  p.set('ward', selectedWard)
    fetch(`/api/recipients?${p}`)
      .then(r => r.json())
      .then(d => setTotalNumbers(d.count ?? 0))
  }, [selectedState, selectedLGA, selectedWard])

  function getWardScore(ward: string, lga: string): WardData | null {
    return wardData.find(w => w.ward === ward && w.lga === lga) ?? null
  }

  function getColor(score: number | null): string {
    if (score === null) return 'rgba(255,255,255,0.05)'
    if (score >= 80) return 'rgba(29,158,117,0.65)'
    if (score >= 60) return 'rgba(201,168,76,0.55)'
    if (score >= 40) return 'rgba(74,144,217,0.55)'
    return 'rgba(216,90,48,0.55)'
  }

  function getMetricScore(w: WardData): number | null {
    if (metric === 'reach')     return w.reach_pct
    if (metric === 'sentiment') return w.sentiment_score
    return w.response_count > 0 ? Math.min(w.response_count * 10, 100) : null
  }

  function launchCampaign() {
    const params = new URLSearchParams()
    if (selectedState) params.set('state', selectedState)
    if (selectedLGA)   params.set('lga', selectedLGA)
    if (selectedWard)  params.set('ward', selectedWard)
    router.push(`/dashboard/broadcast?${params}`)
  }

  // Get wards to display
  const displayWards = selectedLGA
    ? getWards(selectedState, selectedLGA)
    : lgas.flatMap(lga => getWards(selectedState, lga).slice(0, 3))

  return (
    <div className="max-w-[1200px] space-y-5">
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Campaign</div>
        <h1 className="font-serif text-3xl font-black text-white">Ward <span className="text-[#C9A84C]">Targeting</span></h1>
        <p className="text-sm text-white/40 mt-1">Select your target geography. See coverage and sentiment per ward. Launch a campaign directly from here.</p>
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-5">
        {/* Left: selectors */}
        <div className="space-y-4">
          {/* Geo selectors */}
          <div className="card space-y-3">
            <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">Target Geography</div>
            <div>
              <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">State</label>
              <select
                className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none"
                value={selectedState}
                onChange={e => { setSelectedState(e.target.value); setSelectedLGA(''); setSelectedWard('') }}
              >
                <option value="">All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">LGA</label>
              <select
                className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-40"
                value={selectedLGA}
                onChange={e => { setSelectedLGA(e.target.value); setSelectedWard('') }}
                disabled={!selectedState}
              >
                <option value="">All LGAs</option>
                {lgas.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Ward</label>
              <select
                className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none disabled:opacity-40"
                value={selectedWard}
                onChange={e => setSelectedWard(e.target.value)}
                disabled={!selectedLGA}
              >
                <option value="">All Wards</option>
                {wards.map(w => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>
          </div>

          {/* Reach summary */}
          <div className="card">
            <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">Target Summary</div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/50">Numbers in database</span>
                <span className="font-bold font-mono text-[#F2D98A]">{totalNumbers.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-white/50">Selected area</span>
                <span className="text-[12px] font-semibold text-white/70 truncate max-w-[120px] text-right">
                  {selectedWard || selectedLGA || selectedState || 'None'}
                </span>
              </div>
              {totalNumbers > 0 && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/50">Est. WhatsApp reach</span>
                    <span className="font-bold text-[#1D9E75]">{Math.round(totalNumbers * 0.72).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-white/50">Est. SMS reach</span>
                    <span className="font-bold text-[#4A90D9]">{totalNumbers.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
            <button
              onClick={launchCampaign}
              disabled={!selectedState || totalNumbers === 0}
              className="w-full mt-4 bg-[#C9A84C] text-black font-bold text-sm py-2.5 rounded-lg hover:bg-[#F2D98A] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Launch Campaign Here →
            </button>
          </div>

          {/* Legend */}
          <div className="card">
            <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-2">Map Legend</div>
            <div className="space-y-1.5">
              {[
                { color: 'rgba(29,158,117,0.65)',  label: '80%+ Excellent coverage' },
                { color: 'rgba(201,168,76,0.55)',   label: '60–79% Good coverage' },
                { color: 'rgba(74,144,217,0.55)',   label: '40–59% Moderate' },
                { color: 'rgba(216,90,48,0.55)',    label: '<40% Needs attention' },
                { color: 'rgba(255,255,255,0.05)',  label: 'No data yet' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-2 text-[10px] text-white/50">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: l.color, border: '1px solid rgba(255,255,255,0.1)' }} />
                  {l.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: ward grid */}
        <div className="space-y-4">
          {/* Metric toggle */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30 mr-1">Show:</span>
            {(['reach', 'sentiment', 'response'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg capitalize transition-all ${
                  metric === m ? 'bg-[#C9A84C] text-black' : 'bg-[#1A1A1A] text-white/40 border border-white/8 hover:text-white/70'
                }`}
              >
                {m === 'reach' ? 'Reach %' : m === 'sentiment' ? 'Sentiment' : 'Responses'}
              </button>
            ))}
            {wardData.length > 0 && (
              <span className="ml-auto text-[10px] text-white/25">{wardData.length} wards with data</span>
            )}
          </div>

          {/* Ward grid */}
          {selectedLGA ? (
            <div className="card">
              <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
                {selectedLGA} — All Wards
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                {wards.map(ward => {
                  const data = getWardScore(ward, selectedLGA)
                  const score = data ? getMetricScore(data) : null
                  const isSelected = selectedWard === ward
                  return (
                    <button
                      key={ward}
                      onClick={() => setSelectedWard(prev => prev === ward ? '' : ward)}
                      className={`relative p-3 rounded-xl text-left transition-all hover:scale-105 ${isSelected ? 'ring-2 ring-[#C9A84C]' : ''}`}
                      style={{
                        background: getColor(score),
                        border: `1px solid ${isSelected ? '#C9A84C' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <div className="text-[10px] font-semibold text-white leading-tight mb-1">{ward}</div>
                      <div className="font-mono font-bold text-[13px] text-white">
                        {score !== null ? (metric === 'response' ? score : `${score.toFixed(0)}%`) : '—'}
                      </div>
                      {data && (
                        <div className="text-[8px] text-white/50 mt-0.5">
                          {data.recipients_total.toLocaleString()} numbers
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {lgas.slice(0, 10).map(lga => {
                const lgaWards = getWards(selectedState, lga)
                const lgaData = wardData.filter(w => w.lga === lga)
                const avgScore = lgaData.length > 0
                  ? lgaData.reduce((s, w) => s + (getMetricScore(w) ?? 0), 0) / lgaData.length
                  : null
                return (
                  <div key={lga} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[13px] font-bold text-white">{lga}</div>
                        <div className="text-[10px] text-white/35">{lgaWards.length} wards · {lgaData.reduce((s,w) => s + w.recipients_total, 0).toLocaleString()} numbers</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {avgScore !== null && (
                          <div className="font-mono font-bold text-[14px]" style={{ color: avgScore >= 60 ? '#1D9E75' : avgScore >= 40 ? '#C9A84C' : '#D85A30' }}>
                            {avgScore.toFixed(0)}%
                          </div>
                        )}
                        <button
                          onClick={() => { setSelectedLGA(lga); setSelectedWard('') }}
                          className="text-[10px] font-semibold border border-[rgba(201,168,76,0.25)] text-[#C9A84C]/70 px-2.5 py-1 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all"
                        >
                          View Wards →
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {lgaWards.slice(0, 8).map(ward => {
                        const data = getWardScore(ward, lga)
                        const score = data ? getMetricScore(data) : null
                        return (
                          <div
                            key={ward}
                            className="px-2 py-1 rounded text-[9px] font-semibold text-white cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ background: getColor(score), border: '1px solid rgba(255,255,255,0.08)' }}
                            onClick={() => { setSelectedLGA(lga); setSelectedWard(ward) }}
                            title={`${ward}: ${score !== null ? score.toFixed(0) + '%' : 'No data'}`}
                          >
                            {ward.length > 15 ? ward.substring(0, 12) + '…' : ward}
                          </div>
                        )
                      })}
                      {lgaWards.length > 8 && (
                        <div className="px-2 py-1 rounded text-[9px] text-white/30 bg-white/5">+{lgaWards.length - 8} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
