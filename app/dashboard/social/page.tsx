'use client'
// app/dashboard/social/page.tsx
// Social Media Command Centre — with real influencer CRUD

import { useState, useEffect } from 'react'
import { Plus, Trash2, Send, Edit2, CheckCircle, X } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────
interface Influencer {
  id: string
  handle: string
  platform: string
  full_name: string | null
  followers: number | null
  contact: string | null
  rate_per_post: number | null
  niche: string | null
  notes: string | null
  status: 'unengaged' | 'commissioned' | 'active' | 'inactive'
  sentiment_score: number | null
  last_post_url: string | null
  last_post_reach: number | null
  last_briefed_at: string | null
}

const PLATFORMS = [
  { value: 'instagram',  label: '📸 Instagram',  color: '#E1306C' },
  { value: 'twitter',    label: '𝕏 Twitter/X',   color: '#1DA1F2' },
  { value: 'facebook',   label: '👍 Facebook',   color: '#1877F2' },
  { value: 'youtube',    label: '▶ YouTube',     color: '#FF0000' },
  { value: 'tiktok',     label: '🎵 TikTok',     color: '#000000' },
  { value: 'whatsapp',   label: '💬 WhatsApp',   color: '#25D366' },
]

const STATUS_STYLE: Record<string, string> = {
  unengaged:   'bg-white/8 text-white/40',
  commissioned:'bg-[#C9A84C]/10 text-[#C9A84C] border border-[#C9A84C]/30',
  active:      'bg-[#1D9E75]/10 text-[#1D9E75] border border-[#1D9E75]/30',
  inactive:    'bg-[#D85A30]/10 text-[#D85A30] border border-[#D85A30]/30',
}

const NARRATIVE_TEMPLATES: Record<string, string> = {
  'Infrastructure': 'Hi {handle}! We would love to collaborate with you on sharing the progress our candidate has made on infrastructure — roads, bridges, and community development. Your audience would appreciate hearing about these real achievements. Let us know your rate and availability.',
  'Security':       'Hi {handle}! We are reaching out to discuss a collaboration around the security improvements in the state. We think your platform would be perfect for sharing this important message with your audience.',
  'GOTV':           'Hi {handle}! With elections approaching, we would love to work with you on a Get Out The Vote campaign. This is bigger than politics — it is about making sure every voice is heard. Let us know if you are interested.',
  'Economy':        'Hi {handle}! We would like to collaborate on content about economic development and job creation in the state. Your audience deserves to know what is being done for them.',
  'Election Day':   'Hi {handle}! We need your help on election day — a simple reminder to your followers to go out and vote. This is the most important day. Let us discuss a collaboration.',
}

// ── Mock platform data (real data needs Twitter/Meta API) ──────
const PLATFORM_SENTIMENT = [
  { platform: 'X / Twitter',     icon: '𝕏',  color: '#1DA1F2', positive: 61, neutral: 22, negative: 17, volume: '42.8K' },
  { platform: 'WhatsApp Groups', icon: '💬', color: '#25D366', positive: 74, neutral: 16, negative: 10, volume: '8.4K'  },
  { platform: 'Instagram',       icon: '📸', color: '#E1306C', positive: 68, neutral: 20, negative: 12, volume: '31.2K' },
  { platform: 'Facebook',        icon: '👍', color: '#1877F2', positive: 58, neutral: 24, negative: 18, volume: '27.5K' },
  { platform: 'YouTube',         icon: '▶',  color: '#FF0000', positive: 79, neutral: 14, negative: 7,  volume: '184K'  },
]

export default function SocialMediaPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showAdd,     setShowAdd]     = useState(false)
  const [editing,     setEditing]     = useState<string | null>(null)
  const [briefTarget, setBriefTarget] = useState<Influencer | null>(null)
  const [briefText,   setBriefText]   = useState('')
  const [briefTheme,  setBriefTheme]  = useState('Infrastructure')
  const [saving,      setSaving]      = useState(false)
  const [toast,       setToast]       = useState('')
  const [tab,         setTab]         = useState<'overview' | 'influencers' | 'compose'>('overview')

  const [form, setForm] = useState({
    handle: '', platform: 'instagram', full_name: '',
    followers: '', contact: '', rate_per_post: '', niche: '', notes: '',
  })

  useEffect(() => { loadInfluencers() }, [])

  async function loadInfluencers() {
    setLoading(true)
    try {
      const res = await fetch('/api/influencers')
      const data = await res.json()
      setInfluencers(Array.isArray(data) ? data : [])
    } catch { setInfluencers([]) }
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleAdd() {
    if (!form.handle.trim()) return
    setSaving(true)
    const res = await fetch('/api/influencers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        followers:     form.followers     ? parseInt(form.followers)     : null,
        rate_per_post: form.rate_per_post ? parseInt(form.rate_per_post) : null,
      })
    })
    if (res.ok) {
      setShowAdd(false)
      setForm({ handle:'', platform:'instagram', full_name:'', followers:'', contact:'', rate_per_post:'', niche:'', notes:'' })
      showToast('✓ Influencer added')
      loadInfluencers()
    }
    setSaving(false)
  }

  async function handleDelete(id: string, handle: string) {
    if (!confirm(`Remove ${handle} from your network?`)) return
    await fetch(`/api/influencers/${id}`, { method: 'DELETE' })
    showToast(`${handle} removed`)
    loadInfluencers()
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/influencers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    })
    loadInfluencers()
  }

  async function handleBrief() {
    if (!briefTarget || !briefText.trim()) return
    setSaving(true)
    await fetch(`/api/influencers/${briefTarget.id}/brief`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief_text: briefText, send_via: 'manual' })
    })
    showToast(`✓ Brief recorded for ${briefTarget.handle}`)
    setBriefTarget(null)
    setBriefText('')
    loadInfluencers()
    setSaving(false)
  }

  async function updatePostStats(id: string, url: string, reach: string) {
    await fetch(`/api/influencers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ last_post_url: url, last_post_reach: reach ? parseInt(reach) : null, status: 'active' })
    })
    setEditing(null)
    showToast('✓ Post stats updated')
    loadInfluencers()
  }

  const getPlatformColor = (p: string) => PLATFORMS.find(x => x.value === p)?.color ?? '#C9A84C'
  const getPlatformLabel = (p: string) => PLATFORMS.find(x => x.value === p)?.label ?? p

  const totalReach    = influencers.filter(i => i.status === 'active' || i.status === 'commissioned').reduce((s, i) => s + (i.followers ?? 0), 0)
  const activeCount   = influencers.filter(i => i.status === 'active').length
  const avgRate       = influencers.filter(i => i.rate_per_post).reduce((s,i,_,a) => s + (i.rate_per_post ?? 0) / a.length, 0)

  return (
    <div className="max-w-[1300px] space-y-5">
      {/* Toast */}
      {toast && (
        <div className="fixed top-16 right-5 z-50 bg-[#141414] border border-[rgba(201,168,76,0.4)] text-[#F2D98A] text-[12px] font-semibold px-4 py-3 rounded-xl shadow-2xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Social Media</div>
        <h1 className="font-serif text-3xl font-black text-white">Narrative <span className="text-[#C9A84C]">Control Centre</span></h1>
        <p className="text-sm text-white/40 mt-1">Monitor public perception, manage your influencer network, and push your narrative across every platform.</p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-2 border-b border-[rgba(201,168,76,0.12)] pb-0">
        {[
          { key: 'overview',    label: 'Public Perception' },
          { key: 'influencers', label: `Influencer Network (${influencers.length})` },
          { key: 'compose',     label: 'Sponsored Post Composer' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-all -mb-px ${
              tab === t.key
                ? 'border-[#C9A84C] text-[#F2D98A]'
                : 'border-transparent text-white/40 hover:text-white/70'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: PUBLIC PERCEPTION ─────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-5">
          {/* API notice */}
          <div className="bg-[#4A90D9]/8 border border-[#4A90D9]/25 rounded-xl p-4 flex items-start gap-3">
            <div className="text-[#4A90D9] text-lg flex-shrink-0">ℹ</div>
            <div>
              <div className="text-[12px] font-semibold text-[#4A90D9] mb-0.5">Live social monitoring requires API connections</div>
              <div className="text-[11px] text-white/50 leading-relaxed">
                Twitter API ($100/month) shows real tweets about your candidate. Meta API (free, 1-2 week approval) shows Facebook/Instagram public mentions. 
                <span className="text-[#C9A84C]"> Apply for Meta API now at developers.facebook.com — it's free and approval takes 1-2 weeks.</span>
                {' '}The data below is demonstration of what the live feed looks like.
              </div>
            </div>
          </div>

          {/* Platform sentiment bars */}
          <div className="card">
            <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-4">
              Public Perception — What People Are Saying
            </div>
            <div className="space-y-3">
              {PLATFORM_SENTIMENT.map(p => (
                <div key={p.platform} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 border"
                    style={{ background: `${p.color}18`, borderColor: `${p.color}40`, color: p.color }}>
                    {p.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-white mb-1">{p.platform}</div>
                    <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
                      <div className="rounded-full bg-[#1D9E75]" style={{ width: `${p.positive}%` }} />
                      <div className="rounded-full bg-[#C9A84C]/60" style={{ width: `${p.neutral}%` }} />
                      <div className="rounded-full bg-[#D85A30]" style={{ width: `${p.negative}%` }} />
                    </div>
                    <div className="flex gap-3 mt-1 text-[9px] font-semibold">
                      <span className="text-[#1D9E75]">{p.positive}% positive</span>
                      <span className="text-white/25">{p.neutral}% neutral</span>
                      <span className="text-[#D85A30]">{p.negative}% negative</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-mono font-bold text-[#F2D98A] text-[12px]">{p.volume}</div>
                    <div className="text-[9px] text-white/25">mentions</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trending + negative alerts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">Trending Hashtags</div>
              {[
                { tag: '#LagosForward',  count: '42K', type: 'owned',       c: '#1D9E75' },
                { tag: '#Adeyemi2025',   count: '28K', type: 'owned',       c: '#1D9E75' },
                { tag: '#LagosRoads',    count: '12K', type: 'opportunity', c: '#C9A84C' },
                { tag: '#LagosWater',    count: '8K',  type: 'risk',        c: '#D85A30' },
                { tag: '#LagosFailure',  count: '4K',  type: 'counter',     c: '#D85A30' },
              ].map(h => (
                <div key={h.tag} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
                  <div className="font-mono text-[11px] font-bold flex-1" style={{ color: h.c }}>{h.tag}</div>
                  <div className="text-[9px] text-white/30 font-mono">{h.count}</div>
                  <div className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ color: h.c, background: `${h.c}15` }}>{h.type}</div>
                </div>
              ))}
            </div>
            <div className="card border-[#D85A30]/20">
              <div className="text-[10px] font-bold text-[#D85A30] tracking-widest uppercase mb-3">⚠ High-Priority Mentions</div>
              {[
                { platform: '𝕏', handle: '@LagosObserver', text: 'Still no water in Mushin for 3 weeks. #LagosFailure', impressions: '12.4K' },
                { platform: '👍', handle: 'Bode Adewale',   text: 'Agege bridge abandoned for 6 months. Is this delivery?', impressions: '3.2K' },
              ].map((m, i) => (
                <div key={i} className="bg-[#1A1A1A] rounded-lg p-3 mb-2 last:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{m.platform}</span>
                    <span className="text-[11px] font-bold text-white">{m.handle}</span>
                    <span className="ml-auto text-[9px] text-[#D85A30] font-mono">{m.impressions}</span>
                  </div>
                  <p className="text-[11px] text-white/55 italic mb-2">{m.text}</p>
                  <button onClick={() => { setTab('compose') }} className="text-[9px] font-bold bg-[#C9A84C] text-black px-2.5 py-1 rounded-lg">
                    Counter Narrative →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: INFLUENCER NETWORK ────────────────────────────── */}
      {tab === 'influencers' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Influencers', value: influencers.length,                           color: '#C9A84C' },
              { label: 'Active',            value: activeCount,                                  color: '#1D9E75' },
              { label: 'Total Reach',       value: totalReach > 0 ? `${(totalReach/1000).toFixed(0)}K` : '0', color: '#4A90D9' },
              { label: 'Avg Rate/Post',     value: avgRate > 0 ? `₦${Math.round(avgRate).toLocaleString()}` : '—', color: '#F2D98A' },
            ].map(c => (
              <div key={c.label} className="card relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${c.color}, transparent)` }} />
                <div className="text-[9px] uppercase tracking-widest text-white/35 mb-1">{c.label}</div>
                <div className="font-serif text-2xl font-bold" style={{ color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Add influencer button */}
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">Your Influencer Network</div>
            <button onClick={() => setShowAdd(v => !v)} className="flex items-center gap-1.5 bg-[#C9A84C] text-black font-bold text-[11px] px-3 py-2 rounded-lg hover:bg-[#F2D98A] transition-all">
              <Plus size={12} />{showAdd ? 'Cancel' : 'Add Influencer'}
            </button>
          </div>

          {/* Add form */}
          {showAdd && (
            <div className="card border-[rgba(201,168,76,0.3)] bg-[rgba(201,168,76,0.03)]">
              <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Add New Influencer</div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[
                  { label: 'Handle *', key: 'handle', placeholder: '@handle or channel name' },
                  { label: 'Full Name', key: 'full_name', placeholder: 'Real name' },
                  { label: 'Contact (Phone/Email)', key: 'contact', placeholder: '080XXXXXXXX or email' },
                  { label: 'Followers', key: 'followers', placeholder: 'e.g. 50000', type: 'number' },
                  { label: 'Rate per Post (₦)', key: 'rate_per_post', placeholder: 'e.g. 150000', type: 'number' },
                  { label: 'Niche', key: 'niche', placeholder: 'e.g. Politics, Lifestyle, News' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">{f.label}</label>
                    <input
                      type={f.type ?? 'text'}
                      className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[rgba(201,168,76,0.55)]"
                      placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">Platform</label>
                  <select
                    className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-[12px] outline-none"
                    value={form.platform}
                    onChange={e => setForm({ ...form, platform: e.target.value })}
                  >
                    {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">Notes</label>
                  <input
                    className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[rgba(201,168,76,0.55)]"
                    placeholder="Any notes about this influencer"
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAdd} disabled={saving || !form.handle.trim()} className="bg-[#C9A84C] text-black font-bold text-[12px] px-4 py-2 rounded-lg hover:bg-[#F2D98A] disabled:opacity-50 transition-all">
                  {saving ? 'Adding…' : 'Add to Network →'}
                </button>
                <button onClick={() => setShowAdd(false)} className="border border-white/10 text-white/40 text-[12px] px-4 py-2 rounded-lg hover:bg-white/5 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Influencer list */}
          {loading ? (
            <div className="text-center py-8 text-white/25 text-sm">Loading…</div>
          ) : influencers.length === 0 ? (
            <div className="card text-center py-12 text-white/25">
              <div className="text-sm mb-1">No influencers yet</div>
              <div className="text-[11px]">Add your first influencer above to start building your network</div>
            </div>
          ) : (
            <div className="space-y-3">
              {influencers.map(inf => (
                <div key={inf.id} className="card hover:border-[rgba(201,168,76,0.2)] transition-all">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                      style={{ background: `${getPlatformColor(inf.platform)}25`, border: `1px solid ${getPlatformColor(inf.platform)}40`, color: getPlatformColor(inf.platform) }}>
                      {inf.handle.replace('@','').substring(0,2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-bold text-[14px] text-white">{inf.handle}</span>
                        <span className="text-[10px] text-white/40">{getPlatformLabel(inf.platform)}</span>
                        {inf.full_name && <span className="text-[10px] text-white/30">· {inf.full_name}</span>}
                      </div>
                      <div className="flex gap-4 text-[10px] text-white/40 mb-2">
                        {inf.followers && <span>👥 {inf.followers.toLocaleString()} followers</span>}
                        {inf.rate_per_post && <span>💰 ₦{inf.rate_per_post.toLocaleString()}/post</span>}
                        {inf.niche && <span>🎯 {inf.niche}</span>}
                        {inf.last_briefed_at && <span>📋 Briefed {new Date(inf.last_briefed_at).toLocaleDateString()}</span>}
                        {inf.last_post_reach && <span>👁 {inf.last_post_reach.toLocaleString()} reach</span>}
                      </div>
                      {inf.notes && <div className="text-[11px] text-white/35 italic">{inf.notes}</div>}
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={inf.status}
                        onChange={e => handleStatusChange(inf.id, e.target.value)}
                        className={`text-[10px] font-bold px-2 py-1 rounded-lg border-none outline-none cursor-pointer ${STATUS_STYLE[inf.status]}`}
                        style={{ background: 'transparent' }}
                      >
                        <option value="unengaged">Unengaged</option>
                        <option value="commissioned">Commissioned</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                      <button
                        onClick={() => { setBriefTarget(inf); setBriefText(NARRATIVE_TEMPLATES['Infrastructure'].replace('{handle}', inf.handle)) }}
                        className="flex items-center gap-1 text-[10px] font-semibold border border-[rgba(201,168,76,0.3)] text-[#C9A84C] px-2.5 py-1.5 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all"
                      >
                        <Send size={10} /> Brief
                      </button>
                      <button
                        onClick={() => setEditing(editing === inf.id ? null : inf.id)}
                        className="w-7 h-7 flex items-center justify-center border border-white/10 text-white/40 rounded-lg hover:text-white/70 hover:border-white/25 transition-all"
                      >
                        <Edit2 size={11} />
                      </button>
                      <button
                        onClick={() => handleDelete(inf.id, inf.handle)}
                        className="w-7 h-7 flex items-center justify-center border border-transparent text-white/20 rounded-lg hover:text-[#D85A30] hover:border-[#D85A30]/25 hover:bg-[#D85A30]/8 transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Edit — update post stats */}
                  {editing === inf.id && (
                    <EditPostStats inf={inf} onSave={updatePostStats} onCancel={() => setEditing(null)} />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: COMPOSE ──────────────────────────────────────── */}
      {tab === 'compose' && (
        <ComposeTab showToast={showToast} />
      )}

      {/* ── BRIEF MODAL ───────────────────────────────────────── */}
      {briefTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-[rgba(201,168,76,0.25)] rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[14px] font-bold text-white">Brief {briefTarget.handle}</div>
              <button onClick={() => setBriefTarget(null)} className="text-white/30 hover:text-white/60"><X size={16} /></button>
            </div>

            <div className="mb-3">
              <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-2">Narrative Theme</label>
              <div className="flex gap-2 flex-wrap">
                {Object.keys(NARRATIVE_TEMPLATES).map(t => (
                  <button key={t} onClick={() => { setBriefTheme(t); setBriefText(NARRATIVE_TEMPLATES[t].replace('{handle}', briefTarget.handle)) }}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${briefTheme===t ? 'bg-[#C9A84C]/10 border-[#C9A84C]/50 text-[#F2D98A]' : 'bg-transparent border-white/10 text-white/40 hover:text-white/60'}`}
                  >{t}</button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-2">Brief Message</label>
              <textarea
                className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2.5 text-[12px] outline-none resize-none min-h-[120px] leading-relaxed focus:border-[rgba(201,168,76,0.55)]"
                value={briefText}
                onChange={e => setBriefText(e.target.value)}
              />
            </div>

            <div className="bg-[#1A1A1A] border border-[rgba(201,168,76,0.12)] rounded-lg p-3 mb-4 text-[11px] text-white/40 leading-relaxed">
              <strong className="text-white/60">How to send:</strong> Copy this message and send to {briefTarget.handle} via WhatsApp ({briefTarget.contact ?? 'contact not set'}) or DM on {briefTarget.platform}. Click Record Brief below to mark it as sent in the system.
            </div>

            <div className="flex gap-2">
              <button onClick={() => { navigator.clipboard.writeText(briefText); showToast('Brief copied to clipboard') }} className="flex-1 border border-[rgba(201,168,76,0.3)] text-[#C9A84C] font-semibold text-[12px] py-2 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all">
                Copy Brief
              </button>
              <button onClick={handleBrief} disabled={saving || !briefText.trim()} className="flex-1 bg-[#C9A84C] text-black font-bold text-[12px] py-2 rounded-lg hover:bg-[#F2D98A] disabled:opacity-50 transition-all">
                {saving ? 'Recording…' : '✓ Record as Sent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────

function EditPostStats({ inf, onSave, onCancel }: { inf: Influencer; onSave: (id:string,url:string,reach:string)=>void; onCancel:()=>void }) {
  const [url,   setUrl]   = useState(inf.last_post_url ?? '')
  const [reach, setReach] = useState(inf.last_post_reach?.toString() ?? '')
  return (
    <div className="mt-3 pt-3 border-t border-[rgba(201,168,76,0.1)] grid grid-cols-3 gap-3">
      <div className="col-span-2">
        <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">Post URL</label>
        <input className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[rgba(201,168,76,0.55)]" placeholder="https://instagram.com/p/..." value={url} onChange={e=>setUrl(e.target.value)} />
      </div>
      <div>
        <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">Reach</label>
        <input type="number" className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-1.5 text-[12px] outline-none" placeholder="50000" value={reach} onChange={e=>setReach(e.target.value)} />
      </div>
      <div className="col-span-3 flex gap-2">
        <button onClick={()=>onSave(inf.id,url,reach)} className="bg-[#1D9E75] text-white font-bold text-[11px] px-3 py-1.5 rounded-lg hover:opacity-90 transition-all flex items-center gap-1"><CheckCircle size={11}/>Save Stats</button>
        <button onClick={onCancel} className="border border-white/10 text-white/40 text-[11px] px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">Cancel</button>
      </div>
    </div>
  )
}

function ComposeTab({ showToast }: { showToast: (msg:string)=>void }) {
  const [content,   setContent]   = useState('')
  const [platforms, setPlatforms] = useState(['instagram'])
  const [theme,     setTheme]     = useState('Infrastructure')

  const TEMPLATES: Record<string,string> = {
    'Infrastructure': '127km of roads built. 40 bridges completed. Progress you can see. Progress you can drive on. #LagosForward',
    'Security':       'Security is our promise. Crime down 34% across the state. Your family is safer today. #SafeLagos',
    'Economy':        '12,000 jobs created this term. New industries. New opportunities. The economy works for everyone. #EconomyFirst',
    'GOTV':           'Election day is coming. Your vote is your voice. Make it count. 🗳 #VoteForChange',
    'Counter':        'Facts matter. 127km roads. 40 bridges. 34% crime reduction. 12,000 jobs. The work speaks for itself.',
  }

  return (
    <div className="grid grid-cols-[1fr_320px] gap-5">
      <div className="space-y-4">
        <div className="card">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-4">Sponsored Post Composer</div>

          <div className="mb-3">
            <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-2">Platforms</label>
            <div className="flex gap-2 flex-wrap">
              {PLATFORMS.map(p => (
                <button key={p.value} onClick={()=>setPlatforms(prev=>prev.includes(p.value)?prev.filter(x=>x!==p.value):[...prev,p.value])}
                  className={`text-[10px] font-semibold px-3 py-1.5 rounded-full border transition-all ${platforms.includes(p.value)?'border-[#C9A84C]/50 text-[#C9A84C] bg-[#C9A84C]/8':'border-white/10 text-white/35 hover:text-white/60'}`}
                >{p.label}</button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-2">Narrative Theme</label>
            <div className="flex gap-1.5 flex-wrap">
              {Object.keys(TEMPLATES).map(t => (
                <button key={t} onClick={()=>{setTheme(t);setContent(TEMPLATES[t])}}
                  className={`text-[9px] font-semibold px-2.5 py-1 rounded-full border transition-all ${theme===t?'bg-[#C9A84C]/10 border-[#C9A84C]/50 text-[#F2D98A]':'bg-transparent border-white/10 text-white/35 hover:text-white/60'}`}
                >{t}</button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-2">Post Content</label>
            <textarea
              className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2.5 text-[12px] outline-none resize-y min-h-[100px] leading-relaxed focus:border-[rgba(201,168,76,0.55)]"
              placeholder="Write your post content here…"
              value={content}
              onChange={e=>setContent(e.target.value)}
            />
            <div className="text-[9px] text-white/20 text-right mt-0.5 font-mono">{content.length}/280</div>
          </div>

          <div className="bg-[#4A90D9]/8 border border-[#4A90D9]/20 rounded-lg p-3 mb-4 text-[11px] text-white/50">
            <strong className="text-white/70">To publish:</strong> Meta Marketing API approval needed (apply free at developers.facebook.com). Until then, copy this post and publish manually or via your social media manager.
          </div>

          <div className="flex gap-2">
            <button onClick={()=>{navigator.clipboard.writeText(content);showToast('Post copied — ready to publish manually')}} className="flex-1 border border-[rgba(201,168,76,0.3)] text-[#C9A84C] font-semibold text-[12px] py-2.5 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all">
              Copy Post
            </button>
            <button onClick={()=>showToast('Save as draft — coming when Meta API connected')} className="flex-1 bg-[#C9A84C] text-black font-bold text-[12px] py-2.5 rounded-lg hover:bg-[#F2D98A] transition-all">
              Save as Draft →
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">Preview</div>
          <div className="bg-[#1A1A1A] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#D85A30]" />
              <div>
                <div className="text-[11px] font-bold text-white">Campaign Account</div>
                <div className="text-[9px] text-white/30">{platforms.map(p=>PLATFORMS.find(x=>x.value===p)?.label).join(' · ')}</div>
              </div>
            </div>
            <p className="text-[12px] text-white/80 leading-relaxed">{content || 'Your post content appears here…'}</p>
          </div>
        </div>

        <div className="card">
          <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">Publishing Guide</div>
          <div className="space-y-2 text-[11px] text-white/50">
            <div><strong className="text-white/70">Right now:</strong> Use Copy Post and publish manually</div>
            <div><strong className="text-white/70">Meta API (free):</strong> Apply at developers.facebook.com — approve in 1-2 weeks. Then FB + IG publish from here</div>
            <div><strong className="text-white/70">Twitter Ads API ($100/month):</strong> Enables promoted tweets from platform</div>
          </div>
        </div>
      </div>
    </div>
  )
}
