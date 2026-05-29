// app/layout.tsx
import type { Metadata } from 'next'
import { DM_Sans, IBM_Plex_Mono, Playfair_Display } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SmartCandidate — Campaign Intelligence',
  description: 'Ward-level political campaign management. Broadcast, analyse, monitor.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${ibmMono.variable} ${playfair.variable}`}>
      <body className="bg-[#080808] text-[#F0EDE4] antialiased">
        {children}
      </body>
    </html>
  )
}
