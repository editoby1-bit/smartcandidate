import { redirect } from 'next/navigation'
import { createServerSupabase } from '@/lib/db/supabase-server'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const db = createServerSupabase()
  const { data: { user } } = await db.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: userRow } = await db
    .from('users')
    .select('*, candidates(*)')
    .eq('id', user.id)
    .single()

  const candidateName = (userRow as any)?.candidates?.name ?? 'Campaign'
  const userName      = (userRow as any)?.full_name ?? user.email ?? 'User'
  const userRole      = (userRow as any)?.role ?? 'admin'

  return (
    <div className="flex h-screen overflow-hidden bg-[#080808]">
      <Sidebar userRole={userRole} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Topbar
          candidateName={candidateName}
          userName={userName}
          userRole={userRole}
        />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
