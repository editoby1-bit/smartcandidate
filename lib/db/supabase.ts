// lib/db/supabase.ts
// Browser-safe client ONLY — no next/headers import
// Safe to use in both Client and Server Components

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

export function createBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Service role client — bypasses RLS
// Only call from API routes and workers (server-side), never from components
export function createServiceSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
