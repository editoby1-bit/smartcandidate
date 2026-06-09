'use client'
// app/dashboard/social/page.tsx
// Social Media Command Centre
// Narrative control, public perception monitoring, sponsored post management

import { useState, useEffect, useCallback } from 'react'
import type { SocialMention, SponsoredPost } from '@/types'

// ── Types ─────────────────────────────────────────────────────
interface PlatformSentiment {
  platform: string
  icon: string
  color: string
  positive: number
  neutral: number
  negative: number
  total: number
  volume: string
}

interface Hashtag {
  tag: string
  volume: number
  sentiment: 'owned' | 'opportunity' | 'risk' | 'counter'
  count: string
}

interface Influencer {
  handle: string
  platform: string
  followers: string
  sentiment: number
  status: 'active' | 'unengaged' | 'commissioned'
  initials: string
  color: string
}

// ── Mock data (replace with real API calls when social APIs connected) ─────
const PLATFORM_SENTIMENT: PlatformSentiment[] = [
  { platform: 'X / Twitter',      icon: '𝕏',  color: '#1DA1F2', positive: 61, neutral: 22, negative: 17, total: 42800,  volume: '42.8K' },
  { platform: 'WhatsApp Groups',  icon: '💬', color: '#25D366', positive: 74, neutral: 16, negative: 10, total: 8400,   volume: '8.4K' },
  { platform: 'Instagram',        icon: '📸', color: '#E1306C', positive: 68, neutral: 20, negative: 12, total: 31200,  volume: '31.2K' },
  { platform: 'Facebook',         icon: '👍', color: '#1877F2', positive: 58, neutral: 24, negative: 18, total: 27500,  volume: '27.5K' },
  { platform: 'YouTube',          icon: '▶',  color: '#FF0000', positive: 79, neutral: 14, negative: 7,  total: 184000, volume: '184K' },
]

const ISSUES = [
  { label: 'Infrastructure', score: 82, color: '#1D9E75' },
  { label: 'Security',       score: 74, color: '#1D9E75' },
  { label: 'Education',      score: 61, color: '#C9A84C' },
  { label: 'Economy',        score: 55, color: '#C9A84C' },
  { label: 'Water / Utilities', score: 38, color: '#D85A30' },
]

const HASHTAGS: Hashtag[] = [
  { tag: '#LagosForward',  volume: 42000, sentiment: 'owned',       count: '42K' },
  { tag: '#Adeyemi2025',   volume: 28000, sentiment: 'owned',       count: '28K' },
  { tag: '#LagosRoads',    volume: 12000, sentiment: 'opportunity',  count: '12K' },
  { tag: '#LagosWater',    volume: 8000,  sentiment: 'risk',         count: '8K'  },
  { tag: '#LagosFailure',  volume: 4000,  sentiment: 'counter',      count: '4K'  },
]

const INFLUENCERS: Influencer[] = [
  { handle: '@LagosBlog',       platform: '📸', followers: '2.1M', sentiment: 91, status: 'active',      initials: 'LB', color: 'from-[#E1306C] to-[#F77737]' },
  { handle: '@NaijaVoices',     platform: '𝕏',  followers: '840K', sentiment: 87, status: 'active',      initials: 'NV', color: 'from-[#1DA1F2] to-[#4AB8FF]' },
  { handle: 'YoutubNaija',      platform: '▶',  followers: '1.4M', sentiment: 79, status: 'commissioned',initials: 'YN', color: 'from-[#FF0000] to-[#FF6B6B]' },
  { handle: '@TheCityCompass',  platform: '𝕏',  followers: '620K', sentiment: 0,  status: 'unengaged',   initials: 'TC', color: 'from-[#9B7FE8] to-[#C0A0FF]' },
]

const NARRATIVE_TEMPLATES: Record<string, string> = {
  'Infrastructure': '127km of roads built. 40 bridges completed. Gov. Adeyemi is delivering the Lagos we deserve — and the work continues. #LagosForward #Adeyemi2025',
  'Security':       'Security is our promise. Crime down 34% across Lagos under Gov. Adeyemi\'s watch. Your family is safer today. #SafeLagos #Adeyemi2025',
  'Economy':        '12,000 jobs created in Lagos this term. New industries. New opportunities. Gov. Adeyemi\'s economy works for every Lagos resident. #LagosEconomy',
  'Education':      '42 new classrooms. 8,000 students on scholarship. Education is the investment that pays forever. #EduLagos #Adeyemi2025',
  'GOTV':           'Election day is close. Your vote is your voice. Make it count for the Lagos we are building together. 🗳 #LagosVotes',
  'Counter':        'Facts matter. 127km roads, 40 bridges, 34% crime reduction, 12,000 jobs. The work speaks for itself. #LagosForward',
}

const FEED_MENTIONS = [
  { id: '1', platform: '𝕏',  pColor: '#1DA1F2', handle: '@LagosProud',       text: 'Gov. Adeyemi just opened the new Kosofe bridge — this is the Lagos we voted for! 🙌 #LagosForward', sentiment: 'positive', time: '2 min ago',  likes: '2,840', rts: '1,120' },
  { id: '2', platform: '📸', pColor: '#E1306C', handle: '@lagosvibes_ig',     text: 'The new Alimosho road is smooth like butter 😭 Thank you Governor!', sentiment: 'positive', time: '7 min ago',  likes: '4,200', rts: '' },
  { id: '3', platform: '👍', pColor: '#1877F2', handle: 'Chioma Okafor',      text: 'Still no light for 4 days in Surulere. When will this government fix EKEDC? Very disappointed.', sentiment: 'negative', time: '14 min ago', likes: '312',   rts: '87 shares' },
  { id: '4', platform: '𝕏',  pColor: '#1DA1F2', handle: '@NaijaVoices',       text: 'Infrastructure delivery under Adeyemi admin has been remarkable. Numbers don\'t lie — 127km of roads. #LagosForward', sentiment: 'positive', time: '22 min ago', likes: '8,400', rts: '3,200' },
  { id: '5', platform: '📸', pColor: '#E1306C', handle: '@streetreporter_lagos', text: 'Mushin market roads still terrible. Mud everywhere. Meanwhile politicians are cutting ribbons elsewhere.', sentiment: 'negative', time: '35 min ago', likes: '1,840', rts: '' },
]

const NEGATIVE_MENTIONS = [
  { id: 'n1', platform: '𝕏', pColor: '#1DA1F2', handle: '@LagosObserver', text: '"Still no water supply in Mushin for 3 weeks. Where is Gov. Adeyemi? #LagosFailure"', meta: '12,400 impressions · 847 retweets · Growing fast ⚠', severity: 'high' },
  { id: 'n2', platform: '👍', pColor: '#1877F2', handle: 'Bode Adewale',   text: '"Agege bridge construction has been abandoned for 6 months. Is this what delivery looks like?"', meta: '3,200 impressions · 124 shares · Moderate risk', severity: 'medium' },
  { id: 'n3', platform: '📸', pColor: '#E1306C', handle: '@lagosstreets_ig', text: '"Roads everywhere except my street. Surulere has been forgotten."', meta: '1,800 impressions · Low risk', severity: 'low' },
]

export default function SocialMediaPage() {
  const [mentionFilter, setMentionFilter] = useState('all')
  const [postContent, setPostContent]     = useState(NARRATIVE_TEMPLATES['Infrastructure'])
  const [activeNarrative, setNarrative]   = useState('Infrastructure')
  const [activePlatforms, setActivePlats] = useState(['X', 'IG'])
  const [hashtagInput, setHashtagInput]   = useState('')
  const [toastMsg, setToastMsg]           = useState('')
  const [impressions, setImpressions]     = useState(14.8)

  // Tick impressions
  useEffect(() => {
    const t = setInterval(() => {
      setImpressions(n => parseFloat((n + (Math.random() * 0.002)).toFixed(1)))
    }, 5000)
    return () => clearInterval(t)
  }, [])

  function toast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  function togglePlatform(p: string) {
    setActivePlats(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const filtered = mentionFilter === 'all'      ? FEED_MENTIONS
                 : mentionFilter === 'positive' ? FEED_MENTIONS.filter(m => m.sentiment === 'positive')
                 : mentionFilter === 'negative' ? FEED_MENTIONS.filter(m => m.sentiment === 'negative')
                 : FEED_MENTIONS

  const overallSentiment = Math.round(
    PLATFORM_SENTIMENT.reduce((s, p) => s + p.positive * p.total, 0) /
    PLATFORM_SENTIMENT.reduce((s, p) => s + p.total, 0)
  )

  return (
    <div className="max-w-[1300px] space-y-5">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-16 right-5 z-50 bg-[#141414] border border-[rgba(201,168,76,0.4)] text-[#F2D98A] text-[12px] font-semibold px-4 py-3 rounded-xl shadow-2xl transition-all">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <div>
        <div className="text-[9px] tracking-[0.28em] uppercase text-[#C9A84C]/70 mb-1">Social Media · Live</div>
        <h1 className="font-serif text-3xl font-black text-white">
          Narrative <span className="text-[#C9A84C]">Control Centre</span>
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Drive sponsored posts, track public perception, and monitor what Lagos is saying — across every platform, in real time.
        </p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Impressions', value: `${impressions}M`,     delta: '↑ +2.1M today',        color: '#C9A84C' },
          { label: 'Sentiment Score',   value: `${overallSentiment}%`, delta: '↑ +4pts this week',   color: '#1D9E75' },
          { label: 'Active Posts',      value: '47',                   delta: 'Across 4 platforms',   color: '#4A90D9' },
          { label: 'Negative Mentions', value: '284',                  delta: '⚠ 12 require response', color: '#D85A30' },
          { label: 'Sponsored Spend',   value: '₦4.2M',               delta: 'This week · 3 platforms', color: '#F2D98A' },
        ].map(c => (
          <div key={c.label} className="card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${c.color}, transparent)` }} />
            <div className="text-[9px] uppercase tracking-widest text-white/35 mb-1">{c.label}</div>
            <div className="font-serif text-2xl font-bold leading-none mb-1" style={{ color: c.color }}>{c.value}</div>
            <div className="text-[10px] text-white/35">{c.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-5">
        {/* LEFT */}
        <div className="space-y-5">

          {/* Platform sentiment */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">Public Perception — What Lagos Is Saying</div>
              <button onClick={() => toast('Sentiment report exported as PDF')} className="text-[10px] border border-[rgba(201,168,76,0.3)] text-[#C9A84C] px-2.5 py-1 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all">Export</button>
            </div>

            <div className="space-y-3 mb-4">
              {PLATFORM_SENTIMENT.map(p => (
                <div key={p.platform} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 border" style={{ background: `${p.color}18`, borderColor: `${p.color}40`, color: p.color }}>{p.icon}</div>
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

            {/* Issues */}
            <div className="text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-2">Top Issues Being Discussed</div>
            <div className="space-y-2">
              {ISSUES.map(issue => (
                <div key={issue.label} className="flex items-center gap-3">
                  <div className="text-[11px] font-semibold w-32 flex-shrink-0" style={{ color: issue.color }}>{issue.label}</div>
                  <div className="flex-1 h-1.5 bg-white/6 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${issue.score}%`, background: issue.color }} />
                  </div>
                  <div className="text-[10px] font-bold font-mono w-12 text-right" style={{ color: issue.color }}>{issue.score}% +ve</div>
                </div>
              ))}
            </div>

            {/* Water alert */}
            <div className="mt-3 p-3 bg-[#D85A30]/8 border border-[#D85A30]/25 rounded-lg flex items-center gap-3">
              <div className="flex-1 text-[11px] text-[#D85A30] leading-relaxed">
                ⚠ <strong>Water access</strong> is a negative narrative gaining traction — 38% favourable and dropping. Recommend a sponsored post on borehole drilling achievements today.
              </div>
              <button onClick={() => toast('Water narrative response post created and queued')} className="flex-shrink-0 bg-[#D85A30] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg hover:opacity-90 transition-all">
                Create Response →
              </button>
            </div>
          </div>

          {/* Live mentions feed */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">Live Mentions Feed</div>
              <button onClick={() => toast('New mention simulated')} className="text-[10px] border border-[rgba(201,168,76,0.3)] text-[#C9A84C] px-2.5 py-1 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all">+ Simulate</button>
            </div>
            <div className="flex gap-2 flex-wrap mb-3">
              {[['all','All'],['positive','Positive ✓'],['negative','Negative ⚠'],['x','𝕏 Twitter'],['ig','Instagram'],['fb','Facebook']].map(([v,l]) => (
                <button key={v} onClick={() => setMentionFilter(v)} className={`text-[9px] font-bold px-2.5 py-1 rounded-full transition-all border ${mentionFilter===v ? 'bg-[#C9A84C]/10 border-[#C9A84C]/50 text-[#F2D98A]' : 'bg-transparent border-white/10 text-white/40 hover:text-white/70'}`}>{l}</button>
              ))}
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {filtered.map(m => (
                <div key={m.id} className={`p-3 rounded-lg border ${m.sentiment === 'positive' ? 'border-[#1D9E75]/20 bg-[#1D9E75]/4' : 'border-[#D85A30]/20 bg-[#D85A30]/4'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm" style={{ color: m.pColor }}>{m.platform}</span>
                    <span className="text-[11px] font-semibold text-[#F2D98A]">{m.handle}</span>
                    <span className={`text-[9px] font-bold ml-auto ${m.sentiment === 'positive' ? 'text-[#1D9E75]' : 'text-[#D85A30]'}`}>● {m.sentiment}</span>
                    <span className="text-[9px] text-white/25 font-mono">{m.time}</span>
                  </div>
                  <p className="text-[11px] text-white/65 leading-snug mb-1">{m.text}</p>
                  <div className="flex gap-3 text-[9px] text-white/25">
                    <span>❤️ {m.likes}</span>
                    {m.rts && <span>🔁 {m.rts}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Narrative response centre */}
          <div>
            <div className="text-[9px] text-[#C9A84C]/60 uppercase tracking-[0.2em] mb-3 flex items-center gap-3">
              Narrative Response Centre
              <div className="flex-1 h-px bg-[rgba(201,168,76,0.12)]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Negative mentions */}
              <div className="card border-[#D85A30]/20">
                <div className="text-[10px] font-bold text-[#D85A30] tracking-widest uppercase mb-3">⚠ High-Priority Mentions</div>
                <div className="space-y-3">
                  {NEGATIVE_MENTIONS.map(m => (
                    <div key={m.id} className="bg-[#1A1A1A] border border-[#D85A30]/15 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm" style={{ color: m.pColor }}>{m.platform}</span>
                        <span className="text-[11px] font-bold text-white">{m.handle}</span>
                      </div>
                      <p className="text-[11px] text-white/60 leading-snug mb-1 italic">{m.text}</p>
                      <div className="text-[9px] text-[#D85A30]/70 mb-2">{m.meta}</div>
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => toast(`Counter-narrative post queued for ${m.handle}`)} className="text-[9px] font-bold bg-[#C9A84C] text-black px-2.5 py-1 rounded-lg">Counter Narrative</button>
                        <button onClick={() => toast(`AI drafting response to ${m.handle}…`)} className="text-[9px] font-semibold border border-white/15 text-white/50 px-2.5 py-1 rounded-lg hover:text-white/80 transition-all">AI Response</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hashtag tracker */}
              <div className="card">
                <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">Trending Hashtags · Lagos</div>
                <div className="space-y-2 mb-4">
                  {HASHTAGS.map(h => {
                    const maxVol = 42000
                    const pct = Math.round((h.volume / maxVol) * 100)
                    const c = h.sentiment === 'owned' ? '#1D9E75' : h.sentiment === 'opportunity' ? '#C9A84C' : '#D85A30'
                    const label = h.sentiment === 'owned' ? '🏷 Ours' : h.sentiment === 'opportunity' ? '📈 Boost' : h.sentiment === 'counter' ? '🚨 Counter' : '⚠ Risk'
                    return (
                      <div key={h.tag} onClick={() => toast(`${h.tag} — ${h.count} mentions`)} className="flex items-center gap-2 cursor-pointer hover:bg-white/3 rounded-lg p-1 -mx-1 transition-all">
                        <div className="font-mono font-bold text-[11px] w-28 flex-shrink-0" style={{ color: c }}>{h.tag}</div>
                        <div className="flex-1 h-1 bg-white/6 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c }} />
                        </div>
                        <div className="text-[9px] font-mono text-white/35 w-8 text-right">{h.count}</div>
                        <div className="text-[9px] font-bold w-16 text-right" style={{ color: c }}>{label}</div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <div className="text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-2">Launch Hashtag Campaign</div>
                  <div className="flex gap-2">
                    <input className="flex-1 bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[rgba(201,168,76,0.55)]" placeholder="#YourHashtag" value={hashtagInput} onChange={e => setHashtagInput(e.target.value)} />
                    <button onClick={() => { toast(`Hashtag campaign launched: ${hashtagInput}`); setHashtagInput('') }} className="bg-[#C9A84C] text-black font-bold text-[11px] px-3 py-2 rounded-lg hover:bg-[#F2D98A] transition-all">Launch</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">

          {/* Sponsored post composer */}
          <div className="card border-[#E1306C]/25">
            <div className="text-[10px] font-bold text-[#E1306C] tracking-widest uppercase mb-3">📱 Sponsored Post Composer</div>

            {/* Platform selector */}
            <div className="flex gap-2 flex-wrap mb-3">
              {[['X','𝕏 Twitter'],['IG','📸 Instagram'],['FB','👍 Facebook'],['YT','▶ YouTube']].map(([v,l]) => (
                <button key={v} onClick={() => togglePlatform(v)} className={`text-[10px] font-semibold px-3 py-1.5 rounded-full border transition-all ${activePlatforms.includes(v) ? 'border-[#E1306C]/50 text-[#E1306C] bg-[#E1306C]/8' : 'border-white/10 text-white/35 hover:text-white/60'}`}>{l}</button>
              ))}
            </div>

            {/* Narrative theme */}
            <div className="mb-3">
              <div className="text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Narrative Theme</div>
              <div className="flex gap-1.5 flex-wrap">
                {Object.keys(NARRATIVE_TEMPLATES).map(t => (
                  <button key={t} onClick={() => { setNarrative(t); setPostContent(NARRATIVE_TEMPLATES[t]) }} className={`text-[9px] font-semibold px-2.5 py-1 rounded-full border transition-all ${activeNarrative===t ? 'bg-[#C9A84C]/10 border-[#C9A84C]/50 text-[#F2D98A]' : 'bg-transparent border-white/10 text-white/35 hover:text-white/60'}`}>{t}</button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="mb-3">
              <div className="text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1.5">Post Content</div>
              <textarea className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-3 py-2.5 text-[12px] outline-none resize-y min-h-[90px] leading-relaxed focus:border-[rgba(201,168,76,0.55)] transition-colors" value={postContent} onChange={e => setPostContent(e.target.value)} />
              <div className="text-[9px] text-white/20 text-right mt-0.5 font-mono">{postContent.length}/280</div>
            </div>

            {/* Targeting */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { label: 'Target Audience', opts: ['Lagos State — All','Lagos Island + VI','Mainland LGAs','Undecided voters (18–35)','Women voters'] },
                { label: 'Daily Budget',    opts: ['₦50,000 / day','₦150,000 / day','₦300,000 / day','₦500,000 / day'] },
                { label: 'Schedule',        opts: ['Publish now','Best time (AI)','Tonight 7–9pm','Tomorrow morning'] },
              ].map(f => (
                <div key={f.label}>
                  <div className="text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">{f.label}</div>
                  <select className="w-full bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] text-[#F0EDE4] rounded-lg px-2 py-1.5 text-[11px] outline-none">
                    {f.opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <div className="text-[9px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">Est. Reach</div>
                <div className="bg-[#1A1A1A] border border-[rgba(201,168,76,0.18)] rounded-lg px-2 py-1.5 font-mono text-[12px] text-[#F2D98A] font-bold">480K – 720K</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => toast(`🚀 Post published to ${activePlatforms.join(', ')} — live in 30 seconds`)} className="flex-1 bg-[#C9A84C] text-black font-bold text-[11px] py-2 rounded-lg hover:bg-[#F2D98A] transition-all">
                Publish to {activePlatforms.length} Platform{activePlatforms.length !== 1 ? 's' : ''} →
              </button>
              <button onClick={() => toast('AI rewriting for higher engagement…')} className="border border-[rgba(201,168,76,0.3)] text-[#C9A84C] text-[10px] font-semibold px-2.5 py-2 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all">AI Rewrite</button>
            </div>
          </div>

          {/* Active posts */}
          <div className="card">
            <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase mb-3">Active Sponsored Posts</div>
            <div className="space-y-3">
              {[
                { platform: '𝕏 Twitter', pColor: '#1DA1F2', text: '"127 roads built. Lagos is moving forward with Gov. Adeyemi. #LagosForward"', reach: '248K', likes: '4,820', shares: '1,240', sentiment: 94, budget: '₦150K/day · ₦450K spent', status: 'Live · Day 3' },
                { platform: '📸 Instagram', pColor: '#E1306C', text: '"Security is our promise. Crime down 34% across Lagos."', reach: '184K', likes: '8,200', shares: '340', sentiment: 89, budget: '₦300K/day · ₦300K spent', status: 'Live · Day 1' },
              ].map((p, i) => (
                <div key={i} className="bg-[#1A1A1A] border border-[rgba(201,168,76,0.08)] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold" style={{ color: p.pColor }}>{p.platform}</span>
                    <span className="text-[9px] font-bold text-[#1D9E75] bg-[#1D9E75]/10 border border-[#1D9E75]/25 px-2 py-0.5 rounded-full">{p.status}</span>
                  </div>
                  <p className="text-[11px] text-white/55 italic mb-2 leading-snug">{p.text}</p>
                  <div className="flex gap-3 text-[9px] text-white/40 mb-1 flex-wrap">
                    <span>👁 {p.reach} reach</span>
                    <span>❤️ {p.likes}</span>
                    <span>🔁 {p.shares}</span>
                    <span className="text-[#1D9E75] font-bold">↑ {p.sentiment}% positive</span>
                  </div>
                  <div className="text-[9px] text-[#C9A84C]/60 font-mono">{p.budget}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Influencer network */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold text-[#C9A84C] tracking-widest uppercase">Influencer Network</div>
              <button onClick={() => toast('Influencer marketplace — 2,400 verified Lagos influencers')} className="text-[9px] border border-[rgba(201,168,76,0.3)] text-[#C9A84C] px-2 py-1 rounded-lg hover:bg-[rgba(201,168,76,0.08)] transition-all">Find More</button>
            </div>
            <div className="space-y-3">
              {INFLUENCERS.map(inf => (
                <div key={inf.handle} className={`flex items-center gap-3 ${inf.status === 'unengaged' ? 'opacity-55' : ''}`}>
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${inf.color} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>{inf.initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-semibold text-white">{inf.handle} <span className="text-white/30 font-normal text-[10px]">· {inf.followers}</span></div>
                    <div className="text-[9px] text-white/35">{inf.status === 'active' ? 'Active · posts live' : inf.status === 'commissioned' ? 'Commissioned' : 'Not yet engaged'}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {inf.sentiment > 0 && <div className="text-[11px] font-bold text-[#1D9E75]">↑ {inf.sentiment}%</div>}
                    <button onClick={() => toast(`Brief sent to ${inf.handle}`)} className="mt-1 text-[9px] font-semibold border border-[rgba(201,168,76,0.25)] text-[#C9A84C]/70 px-2 py-0.5 rounded hover:bg-[rgba(201,168,76,0.08)] transition-all">
                      {inf.status === 'commissioned' ? 'View' : inf.status === 'active' ? 'Brief' : 'Reach Out'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
