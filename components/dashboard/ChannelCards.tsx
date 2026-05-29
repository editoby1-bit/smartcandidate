'use client'
// components/dashboard/ChannelCards.tsx
interface ChannelStats {
  whatsapp: { sent: number; delivered: number; rate: number }
  sms:      { sent: number; delivered: number; rate: number }
  voice:    { sent: number; delivered: number; rate: number }
}
interface Props { stats: ChannelStats }

export function ChannelCards({ stats }: Props) {
  const channels = [
    { key: 'whatsapp', label: 'WhatsApp', icon: '💬', color: '#25D366', ...stats.whatsapp },
    { key: 'sms',      label: 'SMS',      icon: '📱', color: '#C9A84C', ...stats.sms },
    { key: 'voice',    label: 'Robocall', icon: '📞', color: '#4A90D9', ...stats.voice },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {channels.map(ch => (
        <div key={ch.key} className="card text-center">
          <div className="text-2xl mb-1">{ch.icon}</div>
          <div className="text-[9px] uppercase tracking-widest text-white/35 mb-1">{ch.label}</div>
          <div className="font-serif text-xl font-bold" style={{ color: ch.color }}>
            {ch.sent > 0 ? (ch.sent / 1000).toFixed(0) + 'K' : '—'}
          </div>
          <div className="text-[10px] font-semibold mt-0.5" style={{ color: '#1D9E75' }}>
            {ch.rate > 0 ? `${ch.rate}% delivered` : 'Ready'}
          </div>
        </div>
      ))}
    </div>
  )
}

export default ChannelCards
