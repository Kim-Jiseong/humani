import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchDashboardData } from '@/lib/db/dashboard'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { DashboardView } from '@/components/dashboard/dashboard-view'

// Reads cookies (auth) + live DB via the service-role client — never static.
export const dynamic = 'force-dynamic'

// Researcher-facing analytics across ALL participants. Data is read with the
// service-role client (RLS bypassed) inside fetchDashboardData — that client
// and its key stay server-side; only the serialized summary crosses to the
// client view. Access is login-gated only (no role allowlist, by request);
// do NOT expose this route on a public deployment as-is.
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await fetchDashboardData()
  const generatedAt = new Date().toISOString()

  return (
    <DashboardShell>
      <DashboardView data={data} generatedAt={generatedAt} />
    </DashboardShell>
  )
}
