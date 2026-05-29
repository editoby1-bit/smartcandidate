import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/db/supabase-server'

export default async function RootPage() {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (user) redirect('/dashboard')
  redirect('/auth/login')
}
