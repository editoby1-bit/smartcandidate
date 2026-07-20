'use client'
// app/dashboard/broadcast/page.tsx
// Multi-channel, multi-LGA selection, fixed state dropdown

import { useState, useEffect } from 'react'
import { getStates, getLGAs, getWards } from '@/lib/utils/geography'

interface Campaign {
  id: string; name: string; status: string
  sent_count: number; total_targets: number; channel: string; created_at: string
}

const CHANNELS = [
  { key: 'sms',       label: 'Bulk SMS',         icon: '📱', desc: 'Africa\'s Talking' },
  { key: 'whatsapp',  label: 'WhatsApp',          icon: '💬', desc: 'Fonnte gateway' },
  { key: 'voice',     label: 'Robocall',          icon: '📞', desc: 'Voice broadcast' },
  { key: 'facebook',  label: 'Facebook Post',     icon: '👍', desc: 'Meta API' },
  { key: 'instagram', label: 'Instagram Post',    icon: '📸', desc: 'Meta API' },
  { key: 'twitter',   label: 'Twitter/X Post',    icon: '𝕏',  desc: 'Twitter API' },
]

const STATUS_COLOR: Record<string, string> = {
  draft:     'bg-white/10 text-white/40',
  running:   'bg-[#C9A84C]/15 text-[#C9A84C]',
  completed: 'bg-[#1D9E75]/15 text-[#1D9E75]',
  failed:    'bg-[#D85A30]/15 text-[#D85A30]',
  paused:    'bg-[#4A90D9]/15 text-[#4A90D9]',
}

const SOCIAL_CHANNELS = ['facebook','instagram','twitter']

export default function BroadcastPage() {
  const [campaigns,     setCampaigns]     = useState<Campaign[]>([])
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['sms'])
  const [targetState,   setTargetState]   = useState('')
  const [selectedLGAs,  setSelectedLGAs]  = useState<string[]>([])
  const [targetWard,    setTargetWard]    = useState('')
  const [targetLang,    setTargetLang]    = useState('english')
  const [campaignName,  setCampaignName]  = useState('')
  const [message,       setMessage]       = useState('')
  const [audioUrl,      setAudioUrl]      = useState('')
  const [estimatedReach,setEstimatedReach]= useState<number|null>(null)
  const [launching,     setLaunching]     = useState(false)
  const [launched,      setLaunched]      = useState(false)
  const [error,         setError]         = useState('')
  const [lgaSearch,     setLgaSearch]     = useState('')

  const states = getStates()
  const allLGAs = targetState ? getLGAs(targetState) : []
  const filteredLGAs = lgaSearch ? allLGAs.filter(l => l.toLowerCase().includes(lgaSearch.toLowerCase())) : allLGAs
  const wards = (targetState && selectedLGAs.length === 1) ? getWards(targetState, selectedLGAs[0]) : []

  const hasVoiceChannel  = selectedChannels.includes('voice')
  const hasSocialChannel = selectedChannels.some(c => SOCIAL_CHANNELS.includes(c))
  const hasMsgChannel    = selectedChannels.some(c => ['sms','whatsapp'].includes(c))

  // Load estimated reach when targeting changes
  useEffect(() => {
    if (!targetState && selectedLGAs.length === 0) { setEstimatedReach(null); return }
    const params = new URLSearchParams({ count: 'true' })
    if (targetState) params.set('state', targetState)
    // For multi-LGA we just use the first for count estimate — real send targets all selected
    if (selectedLGAs.length === 1) params.set('lga', selectedLGAs[0])
    if (targetWard) params.set('ward', targetWard)
    fetch(`/api/recipients?${params}`).then(r => r.json()).then(d => setEstimatedReach(d.count ?? 0))
  }, [targetState, selectedLGAs, targetWard])

  // Load recent campaigns
  useEffect(() => {
    fetch('/api/campaigns').then(r => r.json()).then(d => setCampaigns(Array.isArray(d) ? d.slice(0,8) : []))
  }, [launched])

  function toggleChannel(key: string) {
    setSelectedChannels(prev =>
      prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]
    )
  }

  function toggleLGA(lga: string) {
    setSelectedLGAs(prev =>
      prev.includes(lga) ? prev.filter(l => l !== lga) : [...prev, lga]
    )
    setTargetWard('') // reset ward when LGA changes
  }

  function selectAllLGAs() {
    setSelectedLGAs(selectedLGAs.length === allLGAs.length ? [] : [...allLGAs])
  }

  async function handleLaunch() {
    if (!campaignName.trim()) { setError('Campaign name required'); return }
    if (selectedChannels.length === 0) { setError('Select at least one channel'); return }
    if (hasMsgChannel && !message.trim()) { setError('Message required for SMS/WhatsApp'); return }
    if (hasVoiceChannel && !audioUrl.trim() && !message.trim()) { setError('Audio URL or message required for voice'); return }
    setLaunching(true); setError(''); setLaunched(false)

    // Launch one campaign per messaging channel
    const msgChannels = selectedChannels.filter(c => ['sms','whatsapp','voice'].includes(c))
    const socialChannels = selectedChannels.filter(c => SOCIAL_CHANNELS.includes(c))

    try {
      // Create and launch for each messaging channel
      for (const channel of msgChannels) {
        const createRes = await fetch('/api/campaigns', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name:            `${campaignName}${msgChannels.length > 1 ? ` (${channel.toUpperCase()})` : ''}`,
            channel,
            message_body:    message,
            audio_url:       audioUrl || null,
            target_state:    targetState   || null,
            target_lga:      selectedLGAs.length === 1 ? selectedLGAs[0] : null,
            target_lgas:     selectedLGAs.length > 1  ? selectedLGAs : null,
            target_ward:     targetWard    || null,
            target_language: targetLang    || null,
          })
        })
        const campaign = await createRes.json()
        if (campaign.id) {
          await fetch(`/api/campaigns/${campaign.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'launch' })
          })
        }
      }

      // Social channels — show message to post manually / via API
      if (socialChannels.length > 0) {
        // Recorded but not auto-posted (needs Meta/Twitter API)
        console.log('[Broadcast] Social channels selected:', socialChannels, '— post manually or via API when connected')
      }

      setLaunched(true)
      setCampaignName(''); setMessage(''); setAudioUrl('')
      setSelectedChannels(['sms']); setTargetState(''); setSelectedLGAs([]); setTargetWard('')
    } catch { setError('Launch failed — check connection') }
    setLaunching(false)
  }

  return (
    <div className="max-w-[1200px] space-y-5">
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Campaign</div>
        <h1 className="font-serif text-3xl font-black text-white">Broadcast <span className="text-[#C9A84C]">Centre</span></h1>
        <p className="text-sm text-white/40 mt-1">Send your message across multiple channels simultaneously to targeted voter groups.</p>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-5">
        <div className="space-y-5">

          {/* ── STEP 1: CHANNELS ────────────────────────── */}
          <div className="card">
            <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">
              1. Select Channels
              <span className="ml-2 text-white/30 font-normal normal-case">Select one or more</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CHANNELS.map(c => {
                const selected = selectedChannels.includes(c.key)
                const isSocial = SOCIAL_CHANNELS.includes(c.key)
                return (
                  <button key={c.key} onClick={() => toggleChannel(c.key)}
                    className={`p-3 rounded-xl border text-left transition-all relative ${
                      selected
                        ? 'border-[#C9A84C] bg-[rgba(201,168,76,0.08)]'
                        : 'border-white/8 bg-[#141414] hover:border-white/20'
                    }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xl">{c.icon}</span>
                      {selected && <div className="w-4 h-4 rounded-full bg-[#C9A84C] flex items-center justify-center text-black text-[8px] font-black">✓</div>}
                    </div>
                    <div className="text-[12px] font-semibold text-white">{c.label}</div>
                    <div className="text-[10px] text-white/35">{c.desc}</div>
                    {isSocial && <div className="mt-1 text-[9px] text-[#C9A84C]/60">Requires API connection</div>}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setSelectedChannels(['sms','whatsapp','voice'])}
                className="text-[10px] font-semibold border border-white/10 text-white/40 px-3 py-1.5 rounded-lg hover:text-white/70 transition-all">
                All Messaging
              </button>
              <button onClick={() => setSelectedChannels(CHANNELS.map(c => c.key))}
                className="text-[10px] font-semibold border border-[rgba(201,168,76,0.3)] text-[#C9A84C]/70 px-3 py-1.5 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all">
                All Channels
              </button>
              <button onClick={() => setSelectedChannels([])}
                className="text-[10px] font-semibold border border-white/10 text-white/30 px-3 py-1.5 rounded-lg hover:text-white/50 transition-all">
                Clear
              </button>
            </div>
          </div>

          {/* ── STEP 2: AUDIENCE ────────────────────────── */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">2. Target Audience</div>
              {estimatedReach !== null && (
                <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/30 text-[#1D9E75] text-[11px] font-bold px-3 py-1 rounded-full">
                  ~{estimatedReach.toLocaleString()} voters
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* State */}
              <div>
                <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">State</label>
                <select className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none"
                  value={targetState} onChange={e=>{setTargetState(e.target.value);setSelectedLGAs([]);setTargetWard('')}}>
                  <option value="">All States</option>
                  {states.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Language */}
              <div>
                <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Language</label>
                <select className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none"
                  value={targetLang} onChange={e=>setTargetLang(e.target.value)}>
                  <option value="">All Languages</option>
                  {['english','yoruba','hausa','igbo','pidgin'].map(l=><option key={l} value={l} className="capitalize">{l.charAt(0).toUpperCase()+l.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Multi-LGA selector */}
            {targetState && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest">
                    LGAs {selectedLGAs.length > 0 && <span className="text-[#C9A84C] ml-1">({selectedLGAs.length} selected)</span>}
                  </label>
                  <div className="flex gap-2">
                    <button onClick={selectAllLGAs} className="text-[9px] font-semibold text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors">
                      {selectedLGAs.length === allLGAs.length ? 'Deselect All' : 'Select All'}
                    </button>
                    {selectedLGAs.length > 0 && (
                      <button onClick={() => {setSelectedLGAs([]); setTargetWard('')}} className="text-[9px] font-semibold text-white/30 hover:text-white/60 transition-colors">Clear</button>
                    )}
                  </div>
                </div>

                {/* Search */}
                <input
                  className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.12)] text-[#F0EDE4] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[rgba(201,168,76,0.4)] mb-2 placeholder:text-white/20"
                  placeholder="Search LGAs…"
                  value={lgaSearch}
                  onChange={e => setLgaSearch(e.target.value)}
                />

                {/* LGA chips */}
                <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto">
                  {filteredLGAs.map(lga => {
                    const selected = selectedLGAs.includes(lga)
                    return (
                      <button key={lga} onClick={() => toggleLGA(lga)}
                        className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                          selected
                            ? 'bg-[#C9A84C] text-black border-[#C9A84C]'
                            : 'bg-transparent border-white/10 text-white/50 hover:border-[rgba(201,168,76,0.3)] hover:text-white/80'
                        }`}>
                        {lga}
                      </button>
                    )
                  })}
                </div>

                {selectedLGAs.length > 0 && (
                  <div className="mt-2 text-[10px] text-[#C9A84C]/60">
                    Selected: {selectedLGAs.join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* Ward — only show when exactly one LGA selected */}
            {selectedLGAs.length === 1 && wards.length > 0 && (
              <div>
                <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Ward (optional)</label>
                <select className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none"
                  value={targetWard} onChange={e=>setTargetWard(e.target.value)}>
                  <option value="">All Wards</option>
                  {wards.map(w=><option key={w} value={w}>{w}</option>)}
                </select>
              </div>
            )}
            {selectedLGAs.length > 1 && (
              <div className="text-[10px] text-white/30 italic">Ward targeting available when one LGA is selected</div>
            )}
          </div>

          {/* ── STEP 3: CONTENT ─────────────────────────── */}
          <div className="card">
            <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">3. Message Content</div>

            <div className="mb-3">
              <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Campaign Name</label>
              <input className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none focus:border-[rgba(201,168,76,0.55)]"
                placeholder="e.g. GOTV Lagos — June 2027"
                value={campaignName} onChange={e=>setCampaignName(e.target.value)} />
            </div>

            {(hasMsgChannel || hasVoiceChannel) && (
              <div className="mb-3">
                <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">
                  Message
                  <span className="ml-2 text-white/25 font-normal normal-case">Variables: {'{name}'} {'{lga}'} {'{ward}'}</span>
                </label>
                <textarea
                  className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[rgba(201,168,76,0.55)] resize-none min-h-[100px] leading-relaxed"
                  placeholder="Dear {name}, your candidate is working for {lga}. Reply STOP to opt out."
                  value={message} onChange={e=>setMessage(e.target.value)}
                />
                <div className="text-[9px] text-white/20 text-right mt-0.5 font-mono">{message.length} chars</div>
              </div>
            )}

            {hasVoiceChannel && (
              <div className="mb-3">
                <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Audio URL (for Robocall)</label>
                <input className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-sm outline-none focus:border-[rgba(201,168,76,0.55)]"
                  placeholder="https://… paste URL from Audio Library"
                  value={audioUrl} onChange={e=>setAudioUrl(e.target.value)} />
                <div className="text-[10px] text-white/30 mt-1">Upload audio in Audio Library → copy URL → paste here</div>
              </div>
            )}

            {hasSocialChannel && (
              <div className="bg-[#4A90D9]/8 border border-[#4A90D9]/20 rounded-lg p-3 mb-3">
                <div className="text-[11px] text-[#4A90D9] font-semibold mb-1">Social media channels selected</div>
                <div className="text-[10px] text-white/50">
                  {selectedChannels.filter(c=>SOCIAL_CHANNELS.includes(c)).map(c=>c.charAt(0).toUpperCase()+c.slice(1)).join(', ')} posts will be drafted.
                  Direct publishing requires Meta/Twitter API connection. You can copy and post manually, or activate the API to publish from here.
                </div>
              </div>
            )}
          </div>

          {error && <div className="bg-[#D85A30]/10 border border-[#D85A30]/30 rounded-lg p-3 text-[12px] text-[#D85A30]">{error}</div>}

          {launched && (
            <div className="bg-[#1D9E75]/10 border border-[#1D9E75]/30 rounded-xl p-4 text-center">
              <div className="text-[#1D9E75] text-xl mb-1">✓</div>
              <div className="font-bold text-white text-[14px]">Campaign launched — messages are being sent now</div>
              <div className="text-[11px] text-white/40 mt-1">Check your dashboard for real-time delivery stats</div>
            </div>
          )}

          {/* Launch button */}
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-white/40">
              {selectedChannels.length > 0 && (
                <>Sending via: <span className="text-[#F2D98A] font-semibold">{selectedChannels.map(c=>CHANNELS.find(ch=>ch.key===c)?.label).join(', ')}</span></>
              )}
              {estimatedReach !== null && <> · <span className="text-[#1D9E75]">~{estimatedReach.toLocaleString()} recipients</span></>}
            </div>
            <div className="flex gap-2">
              <button onClick={async()=>{
                if (!campaignName.trim()) { setError('Campaign name required'); return }
                const res = await fetch('/api/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({name:campaignName,channel:selectedChannels[0]||'sms',message_body:message,target_state:targetState||null,target_lga:selectedLGAs.length===1?selectedLGAs[0]:null,target_lgas:selectedLGAs.length>1?selectedLGAs:null,target_ward:targetWard||null,target_language:targetLang||null,status:'draft'})})
                if (res.ok) { setError(''); setLaunched(false); alert('Saved as draft') }
              }} className="border border-white/15 text-white/50 font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-white/5 transition-all">
                Save Draft
              </button>
              <button onClick={handleLaunch} disabled={launching||selectedChannels.length===0}
                className="bg-[#C9A84C] text-black font-bold text-sm px-6 py-2.5 rounded-lg hover:bg-[#F2D98A] disabled:opacity-50 transition-all">
                {launching ? 'Launching…' : `Deploy Broadcast →`}
              </button>
            </div>
          </div>
        </div>

        {/* Recent campaigns sidebar */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">Recent Campaigns</div>
          {campaigns.length === 0 ? (
            <div className="card text-center py-6 text-white/25 text-[12px]">No campaigns yet</div>
          ) : campaigns.map(c => (
            <div key={c.id} className="card hover:border-[rgba(201,168,76,0.2)] transition-all">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-[12px] font-semibold text-white leading-snug flex-1">{c.name}</div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${STATUS_COLOR[c.status]??'bg-white/8 text-white/40'}`}>{c.status}</span>
              </div>
              <div className="text-[10px] text-white/40 mb-1">{c.channel?.toUpperCase() ?? 'SMS'}</div>
              <div className="text-[10px] text-white/30 font-mono">
                {c.sent_count?.toLocaleString() ?? 0} / {c.total_targets?.toLocaleString() ?? 1} sent
              </div>
              {c.status === 'running' && (
                <div className="mt-2 h-1 bg-white/6 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C9A84C] rounded-full transition-all"
                    style={{width:`${c.total_targets>0?Math.round((c.sent_count/c.total_targets)*100):0}%`}} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
