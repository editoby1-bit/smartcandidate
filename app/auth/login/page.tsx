'use client'
// app/auth/login/page.tsx
import { useState } from 'react'
import { createBrowserSupabase } from '@/lib/db/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const db = createBrowserSupabase()
    const { error } = await db.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#C9A84C] shadow-[0_0_12px_#C9A84C]" />
            <span className="font-serif font-black text-xl text-[#C9A84C] tracking-wide">
              SmartCandidate
            </span>
          </div>
          <p className="text-white/30 text-sm">Campaign Intelligence Platform</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="card space-y-4">
          <div>
            <label className="block text-[10px] text-[#C9A84C]/70 uppercase tracking-widest mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="sc-input"
              placeholder="you@campaign.ng"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-[#C9A84C]/70 uppercase tracking-widest mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="sc-input"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="text-[#D85A30] text-xs bg-[#D85A30]/10 border border-[#D85A30]/30 rounded-lg p-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p className="text-center text-white/20 text-xs mt-6">
          Contact your campaign administrator for access.
        </p>
      </div>
    </div>
  )
}
