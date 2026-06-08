'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Megaphone, BarChart3,
  Map, Radio, ClipboardList, Trophy, Instagram,
  Settings, LogOut, Zap, Mic, Database
} from 'lucide-react'
import { createBrowserSupabase } from '@/lib/db/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const NAV = [
  {
    label: 'Campaign',
    items: [
      { href: '/dashboard',              icon: LayoutDashboard, label: 'Command Centre' },
      { href: '/dashboard/broadcast',    icon: Megaphone,       label: 'Broadcast',    badgeKey: 'activeCampaigns' },
      { href: '/dashboard/intelligence', icon: BarChart3,       label: 'Intelligence' },
    ]
  },
  {
    label: 'Field',
    items: [
      { href: '/dashboard/monitor',  icon: Map,          label: 'Election Monitor', badgeKey: 'openAlerts', badgeColor: 'red' },
      { href: '/dashboard/agents',   icon: Radio,        label: 'Field Agents' },
      { href: '/dashboard/results',  icon: ClipboardList,label: 'Result Capture' },
      { href: '/dashboard/senders',  icon: Zap,          label: 'WA Sessions' },
    ]
  },
  {
    label: 'Engagement',
    items: [
      { href: '/dashboard/polls',  icon: Trophy,    label: 'Live Polls',   staticBadge: 'Live', badgeColor: 'green' },
      { href: '/dashboard/social', icon: Instagram, label: 'Social Media' },
    ]
  },
  {
    label: 'Data',
    items: [
      { href: '/dashboard/voters',   icon: Database, label: 'Voter Database' },
      { href: '/dashboard/audio',    icon: Mic,      label: 'Audio Library' },
      { href: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ]
  }
]

interface Props {
  userRole: string
  candidateName?: string
  electionName?: string
  electionDate?: string | null
}

interface BadgeCounts {
  activeCampaigns: number
  openAlerts: number
}

export default function Sidebar({ userRole, candidateName, electionName, electionDate }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const [badges, setBadges] = useState<BadgeCounts>({ activeCampaigns: 0, openAlerts: 0 })

  useEffect(() => {
    fetch('/api/analytics?type=dashboard')
      .then(r => r.json())
      .then(d => {
        if (d && typeof d === 'object') {
          setBadges({
            activeCampaigns: d.activeCampaigns ?? 0,
            openAlerts:      d.activeAlerts    ?? 0,
          })
        }
      })
      .catch(() => {})
  }, [])

  async function handleLogout() {
    const db = createBrowserSupabase()
    await db.auth.signOut()
    router.push('/auth/login')
  }

  function daysUntil(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Date TBC'
    const days = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
    if (days < 0)   return 'Election passed'
    if (days === 0) return 'Today!'
    return `${days} days left`
  }

  return (
    <aside className="w-[200px] flex-shrink-0 bg-[#0F0F0F] border-r border-[rgba(201,168,76,0.12)] flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-4 border-b border-[rgba(201,168,76,0.12)]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#C9A84C] shadow-[0_0_8px_#C9A84C] pulse-dot" />
          <span className="font-serif font-black text-[14px] text-[#C9A84C] tracking-wide">
            SmartCandidate
          </span>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-4">
        {NAV.map(section => (
          <div key={section.label}>
            <div className="px-2 mb-1 text-[8px] font-semibold tracking-[0.25em] uppercase text-[#C9A84C]/50">
              {section.label}
            </div>
            {section.items.map((item: any) => {
              const isActive = pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href))
              const badgeVal = item.staticBadge
                ? item.staticBadge
                : item.badgeKey
                ? (badges[item.badgeKey as keyof BadgeCounts] > 0
                    ? String(badges[item.badgeKey as keyof BadgeCounts]) : null)
                : null
              return (
                <Link key={item.href} href={item.href} className={`nav-item ${isActive ? 'active' : ''}`}>
                  <item.icon size={14} className="flex-shrink-0" />
                  <span className="flex-1 truncate text-[12px]">{item.label}</span>
                  {badgeVal && (
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${
                      item.badgeColor === 'red'   ? 'bg-[#D85A30] text-white' :
                      item.badgeColor === 'green' ? 'bg-[#1D9E75] text-white' :
                      'bg-[#C9A84C] text-black'
                    }`}>{badgeVal}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[rgba(201,168,76,0.12)] space-y-1">
        {(electionName || candidateName) && (
          <div className="mx-2 mb-2 bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.18)] rounded-lg p-2.5">
            <div className="text-[8px] text-[#C9A84C]/60 uppercase tracking-widest mb-1">Next Election</div>
            <div className="font-serif text-[13px] font-bold text-[#F2D98A] leading-tight">{electionName ?? candidateName}</div>
            <div className="text-[10px] text-[#C9A84C]/70 font-mono mt-0.5">{daysUntil(electionDate)}</div>
          </div>
        )}
        <button onClick={handleLogout} className="nav-item w-full text-left hover:text-[#D85A30]/80">
          <LogOut size={13} />
          <span className="text-[12px]">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
