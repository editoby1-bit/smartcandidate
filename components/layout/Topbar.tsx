'use client'
// components/layout/Topbar.tsx
import { Bell, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  id: string; type: string; title: string; body: string
  severity: 'critical' | 'high' | 'medium' | 'info'
  created_at: string; href: string
}

interface Props {
  candidateName: string
  candidateState?: string
  userName: string
  userRole: string
}

export default function Topbar({ candidateName, candidateState, userName, userRole }: Props) {
  const [time, setTime]               = useState('')
  const [notifs, setNotifs]           = useState<Notification[]>([])
  const [notifCount, setNotifCount]   = useState(0)
  const [showNotifs, setShowNotifs]   = useState(false)
  const [stats, setStats]             = useState<any>(null)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])

  // Load notifications
  useEffect(() => {
    loadNotifs()
    const t = setInterval(loadNotifs, 60000)
    return () => clearInterval(t)
  }, [])

  // Load live stats
  useEffect(() => {
    loadStats()
    const t = setInterval(loadStats, 30000)
    return () => clearInterval(t)
  }, [])

  async function loadNotifs() {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setNotifs(data.notifications ?? [])
      setNotifCount(data.count ?? 0)
    } catch {}
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/analytics?type=dashboard')
      const data = await res.json()
      setStats(data)
    } catch {}
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayName = candidateState ? `${candidateName} · ${candidateState}` : candidateName

  const SEVERITY_COLOR: Record<string, string> = {
    critical: 'text-[#D85A30] bg-[#D85A30]/10 border-[#D85A30]/25',
    high:     'text-[#D85A30] bg-[#D85A30]/6  border-[#D85A30]/15',
    medium:   'text-[#C9A84C] bg-[#C9A84C]/6  border-[#C9A84C]/15',
    info:     'text-white/50  bg-white/4        border-white/8',
  }

  return (
    <header className="h-[52px] bg-[#0A0A0A]/98 border-b border-[rgba(201,168,76,0.18)] flex items-center justify-between px-5 flex-shrink-0 backdrop-blur-xl z-50">
      {/* Left */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-[#D85A30]/10 border border-[#D85A30]/30 text-[#D85A30] text-[10px] font-bold px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D85A30] pulse-dot" />
          LIVE
        </div>
        <div className="text-[#F2D98A] text-[11px] font-semibold border border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.06)] px-2.5 py-1 rounded-md">
          {displayName}
        </div>
      </div>

      {/* Centre: live stats */}
      <div className="hidden lg:flex items-center gap-5">
        {stats && [
          { label: 'Voters Reached', value: stats.totalReached > 0 ? (stats.totalReached / 1000000).toFixed(1) + 'M' : '0', delta: stats.todayReach > 0 ? `+${stats.todayReach.toLocaleString()} today` : 'No sends yet', up: stats.todayReach > 0 },
          { label: 'Delivery Rate',  value: stats.deliveryRate > 0 ? stats.deliveryRate + '%' : '—',  delta: stats.deliveryRate > 0 ? 'Live' : 'No data', up: stats.deliveryRate > 80 },
          { label: 'Sentiment',      value: stats.sentimentScore > 0 ? stats.sentimentScore + '%' : '—', delta: stats.sentimentScore > 0 ? (stats.sentimentScore >= 65 ? '✓ Above threshold' : '⚠ Below 65%') : 'No responses', up: stats.sentimentScore >= 65 },
        ].map(t => (
          <div key={t.label} className="flex items-center gap-1.5 text-[10px]">
            <span className="text-white/30">{t.label}</span>
            <span className="text-[#F2D98A] font-mono font-semibold">{t.value}</span>
            <span className={t.up ? 'text-[#1D9E75] font-bold' : 'text-white/30'}>{t.delta}</span>
          </div>
        ))}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <span className="text-white/25 text-[10px] font-mono">{time}</span>

        {/* Bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setShowNotifs(v => !v)}
            className="relative w-7 h-7 rounded-lg bg-[#1A1A1A] border border-[rgba(201,168,76,0.15)] flex items-center justify-center hover:border-[rgba(201,168,76,0.4)] transition-colors"
          >
            <Bell size={13} className="text-white/50" />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#D85A30] rounded-full text-[7px] font-bold text-white flex items-center justify-center">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {showNotifs && (
            <div className="absolute right-0 top-9 w-80 bg-[#141414] border border-[rgba(201,168,76,0.2)] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(201,168,76,0.1)]">
                <div className="text-[11px] font-bold text-white">Notifications</div>
                <button onClick={() => setShowNotifs(false)} className="text-white/30 hover:text-white/60 transition-colors">
                  <X size={13} />
                </button>
              </div>
              {notifs.length === 0 ? (
                <div className="text-center py-6 text-white/25 text-[12px]">All clear — no alerts</div>
              ) : (
                <div className="max-h-[320px] overflow-y-auto">
                  {notifs.map(n => (
                    <a key={n.id} href={n.href} onClick={() => setShowNotifs(false)} className={`block px-4 py-3 border-b border-white/5 hover:bg-white/3 transition-colors border-l-2 ${n.severity === 'critical' ? 'border-l-[#D85A30]' : n.severity === 'high' ? 'border-l-[#D85A30]/60' : n.severity === 'medium' ? 'border-l-[#C9A84C]' : 'border-l-transparent'}`}>
                      <div className="text-[12px] font-semibold text-white mb-0.5">{n.title}</div>
                      <div className="text-[10px] text-white/45 leading-snug mb-1">{n.body}</div>
                      <div className="text-[9px] text-white/20 font-mono">
                        {n.created_at ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true }) : ''}
                      </div>
                    </a>
                  ))}
                </div>
              )}
              <div className="px-4 py-2 border-t border-[rgba(201,168,76,0.1)]">
                <button onClick={loadNotifs} className="text-[10px] text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors">Refresh</button>
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div
          className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#D85A30] flex items-center justify-center text-[11px] font-bold text-black cursor-pointer"
          title={`${userName} (${userRole})`}
        >
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
