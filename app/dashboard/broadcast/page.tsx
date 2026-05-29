'use client'
// app/dashboard/broadcast/page.tsx
import { useState, useEffect } from 'react'
import { getStates, getLGAs, getWards, LANGUAGES, CHANNELS } from '@/lib/utils/geography'
import type { Campaign, Template, Channel, Language } from '@/types'

export default function BroadcastPage() {
  const [step, setStep]               = useState(1) // 1=channel 2=audience 3=content 4=review
  const [channel, setChannel]         = useState<Channel>('whatsapp')
  const [state, setState]             = useState('')
  const [lga, setLga]                 = useState('')
  const [ward, setWard]               = useState('')
  const [language, setLanguage]       = useState<Language>('english')
  const [group, setGroup]             = useState('')
  const [name, setName]               = useState('')
  const [body, setBody]               = useState('')
  const [estimatedReach, setEstimated] = useState<number | null>(null)
  const [loading, setLoading]         = useState(false)
  const [launched, setLaunched]       = useState(false)
  const [campaigns, setCampaigns]     = useState<Campaign[]>([])
  const [countLoading, setCountLoading] = useState(false)

  const states = getStates()
  const lgas   = state ? getLGAs(state) : []
  const wards  = (state && lga) ? getWards(state, lga) : []

  // Fetch reach estimate when targeting changes
  useEffect(() => {
    if (!state && !lga && !ward) { setEstimated(null); return }
    setCountLoading(true)
    const params = new URLSearchParams({ count: 'true' })
    if (state) params.set('state', state)
    if (lga)   params.set('lga', lga)
    if (ward)  params.set('ward', ward)
    if (language) params.set('language', language)
    if (group) params.set('group', group)

    fetch(`/api/recipients?${params}`)
      .then(r => r.json())
      .then(d => setEstimated(d.count ?? 0))
      .finally(() => setCountLoading(false))
  }, [state, lga, ward, language, group])

  // Load existing campaigns
  useEffect(() => {
    fetch('/api/campaigns')
      .then(r => r.json())
      .then(d => Array.isArray(d) && setCampaigns(d))
  }, [launched])

  async function handleLaunch() {
    if (!name || !body) return
    setLoading(true)
    try {
      // Create campaign
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, channel, message_body: body, language,
          target_state: state || null,
          target_lga: lga || null,
          target_ward: ward || null,
          target_group: group || null,
        }),
      })
      const { campaign } = await res.json()

      // Launch it
      await fetch(`/api/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'launch' }),
      })

      setLaunched(true)
      setStep(1)
      setName(''); setBody('')
    } finally {
      setLoading(false)
    }
  }

  const CHANNEL_TEMPLATES: Record<Channel, string> = {
    whatsapp: `Dear {name},\n\nGovernor Adeyemi has completed 127km of roads and 40 bridges across Lagos — including in {lga}.\n\nYour community's progress continues with your support.\n\nReply 1 to confirm your vote\nReply 2 for more information\nReply STOP to unsubscribe.`,
    sms: `Dear {name}, Gov. Adeyemi has built 127km of roads and 40 bridges in Lagos. Your community's progress continues. Reply STOP to opt out.`,
    voice: `Hello {name}. This is an important message from the Governor Adeyemi campaign. Your community's progress continues. Press 1 to confirm support. Press 2 for more information.`,
  }

  return (
    <div className="max-w-[1200px]">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Broadcast Centre</div>
        <h1 className="font-serif text-3xl font-black text-white">
          Compose & <span className="text-[#C9A84C]">Deploy</span>
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Reach millions of targeted voters simultaneously across all three channels.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_380px] gap-5">
        {/* LEFT: Composer */}
        <div className="space-y-4">

          {/* Step indicators */}
          <div className="flex gap-2">
            {['Channel', 'Audience', 'Content', 'Review'].map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i + 1)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  step === i + 1
                    ? 'bg-[#C9A84C] text-black'
                    : step > i + 1
                    ? 'bg-[#1D9E75]/15 text-[#1D9E75] border border-[#1D9E75]/30'
                    : 'bg-[#1A1A1A] text-white/40 border border-white/8'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                  step === i + 1 ? 'bg-black/20' : step > i + 1 ? 'bg-[#1D9E75]' : 'bg-white/10'
                }`}>{step > i + 1 ? '✓' : i + 1}</span>
                {s}
              </button>
            ))}
          </div>

          <div className="card space-y-5">
            {/* Step 1: Channel */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-[#C9A84C] text-black text-[9px] font-black flex items-center justify-center">1</div>
                <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Choose Channel</div>
              </div>
              <div className="flex gap-2">
                {CHANNELS.map(ch => (
                  <button
                    key={ch.value}
                    onClick={() => { setChannel(ch.value as Channel); setBody(CHANNEL_TEMPLATES[ch.value as Channel]) }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-semibold flex-1 justify-center transition-all ${
                      channel === ch.value
                        ? 'bg-[#141414] border-2 border-[#C9A84C] text-[#F2D98A]'
                        : 'bg-[#1A1A1A] border border-white/10 text-white/50 hover:border-white/20'
                    }`}
                  >
                    <span>{ch.icon}</span>
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Audience */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-[#C9A84C] text-black text-[9px] font-black flex items-center justify-center">2</div>
                <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Target Audience</div>
                {estimatedReach !== null && (
                  <span className="ml-auto text-[11px] font-bold text-[#1D9E75] bg-[#1D9E75]/10 border border-[#1D9E75]/30 px-2.5 py-0.5 rounded-full">
                    {countLoading ? '...' : `~${estimatedReach.toLocaleString()} voters`}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">State</label>
                  <select className="sc-select" value={state} onChange={e => { setState(e.target.value); setLga(''); setWard('') }}>
                    <option value="">All Lagos State</option>
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">LGA</label>
                  <select className="sc-select" value={lga} onChange={e => { setLga(e.target.value); setWard('') }} disabled={!state}>
                    <option value="">All LGAs</option>
                    {lgas.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">Ward</label>
                  <select className="sc-select" value={ward} onChange={e => setWard(e.target.value)} disabled={!lga}>
                    <option value="">All Wards</option>
                    {wards.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">Language</label>
                  <select className="sc-select" value={language} onChange={e => setLanguage(e.target.value as Language)}>
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Step 3: Content */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-[#C9A84C] text-black text-[9px] font-black flex items-center justify-center">3</div>
                <div className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Message Content</div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">Campaign Name</label>
                  <input
                    className="sc-input"
                    placeholder="e.g. Infrastructure Update — Alimosho"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">
                    Message <span className="text-white/20">· {`{name}`} {`{lga}`} {`{ward}`} {`{candidate_name}`} supported</span>
                  </label>
                  <textarea
                    className="sc-input min-h-[120px] resize-y leading-relaxed"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Type your message…"
                  />
                  <div className="text-[9px] text-white/20 text-right mt-1 font-mono">{body.length} chars</div>
                </div>
              </div>
            </div>

            {/* Launch */}
            <div className="flex items-center justify-between pt-2 border-t border-[rgba(201,168,76,0.1)]">
              <div className="text-[11px] text-white/40">
                Est. reach:{' '}
                <span className="text-[#F2D98A] font-semibold">
                  {estimatedReach !== null ? estimatedReach.toLocaleString() + ' voters' : 'Set a target'}
                </span>
                {' · '}
                <span className="text-[#F2D98A] font-semibold capitalize">{channel}</span>
                {' · '}
                <span className="text-[#F2D98A] font-semibold capitalize">{language}</span>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost text-[12px] px-3 py-2" onClick={() => alert('Saved as draft')}>
                  Save Draft
                </button>
                <button
                  className="btn-gold px-5 py-2 disabled:opacity-40"
                  disabled={!name || !body || loading}
                  onClick={handleLaunch}
                >
                  {loading ? 'Launching…' : 'Deploy Broadcast →'}
                </button>
              </div>
            </div>

            {launched && (
              <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-lg p-3 text-[12px] text-[#1D9E75] font-semibold text-center">
                ✓ Campaign launched — messages are being sent now
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Campaign list */}
        <div className="space-y-3">
          <div className="card">
            <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
              Recent Campaigns
            </div>
            {campaigns.length === 0 ? (
              <div className="text-center py-6 text-white/25 text-[12px]">No campaigns yet</div>
            ) : (
              <div className="space-y-2">
                {campaigns.map(c => {
                  const pct = c.total_targets > 0
                    ? Math.round((c.sent_count / c.total_targets) * 100) : 0
                  return (
                    <div key={c.id} className="bg-[#1A1A1A] border border-[rgba(201,168,76,0.08)] rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div>
                          <div className="text-[12px] font-semibold text-white truncate max-w-[160px]">{c.name}</div>
                          <div className="text-[9px] text-white/30 mt-0.5">
                            {c.target_lga ?? c.target_state ?? 'All Lagos'} · {c.language}
                          </div>
                        </div>
                        <span className={`pill flex-shrink-0 ${
                          c.status === 'running'   ? 'pill-green' :
                          c.status === 'completed' ? 'pill-blue' :
                          c.status === 'scheduled' ? 'pill-gold' : 'pill-grey'
                        }`}>{c.status}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
                          <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[9px] text-white/30 font-mono flex-shrink-0">
                          {c.sent_count.toLocaleString()} / {c.total_targets.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
