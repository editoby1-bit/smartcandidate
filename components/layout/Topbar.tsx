'use client'
// components/layout/Topbar.tsx
import { Bell } from 'lucide-react'
import { useState, useEffect } from 'react'

interface Props {
  candidateName: string
  userName: string
  userRole: string
}

const TICKERS = [
  { pair: 'USD/NGN',  price: '1,584',  chg: '+0.4%', up: true  },
  { pair: 'Voters Reached', price: '2.8M', chg: '+124K today', up: true },
  { pair: 'Open Rate', price: '91.4%', chg: '+2.1%', up: true },
  { pair: 'Sentiment', price: '72%',   chg: '+4pts', up: true  },
]

export default function Topbar({ candidateName, userName, userRole }: Props) {
  const [time, setTime] = useState('')

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }))
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="h-[52px] bg-[#0A0A0A]/98 border-b border-[rgba(201,168,76,0.18)] flex items-center justify-between px-5 flex-shrink-0 backdrop-blur-xl z-50">
      {/* Left: candidate + live badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 bg-[#D85A30]/10 border border-[#D85A30]/30 text-[#D85A30] text-[10px] font-bold px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D85A30] pulse-dot" />
          LIVE
        </div>
        <div className="text-[#F2D98A] text-[11px] font-semibold border border-[rgba(201,168,76,0.25)] bg-[rgba(201,168,76,0.06)] px-2.5 py-1 rounded-md">
          {candidateName} · Lagos
        </div>
      </div>

      {/* Centre: live tickers */}
      <div className="hidden lg:flex items-center gap-5">
        {TICKERS.map(t => (
          <div key={t.pair} className="flex items-center gap-1.5 text-[10px]">
            <span className="text-white/30">{t.pair}</span>
            <span className="text-[#F2D98A] font-mono font-semibold">{t.price}</span>
            <span className={t.up ? 'text-[#1D9E75] font-bold' : 'text-[#D85A30] font-bold'}>{t.chg}</span>
          </div>
        ))}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3">
        <span className="text-white/25 text-[10px] font-mono">{time}</span>
        <button className="relative w-7 h-7 rounded-lg bg-[#1A1A1A] border border-[rgba(201,168,76,0.15)] flex items-center justify-center hover:border-[rgba(201,168,76,0.4)] transition-colors">
          <Bell size={13} className="text-white/50" />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#D85A30] rounded-full text-[7px] font-bold text-white flex items-center justify-center">3</span>
        </button>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#D85A30] flex items-center justify-center text-[11px] font-bold text-black">
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}
