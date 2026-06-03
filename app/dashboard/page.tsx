import { fetchDashboardData } from '@/lib/db/dashboard'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { DashboardView } from '@/components/dashboard/dashboard-view'

// Reads live DB via the service-role client — never static.
export const dynamic = 'force-dynamic'

// Researcher-facing analytics across ALL participants. Data is read with the
// service-role client (RLS bypassed) inside fetchDashboardData — that client
// and its key stay server-side; only the serialized summary crosses to the
// client view.
//
// Access: OPEN (no auth). `/dashboard` is allow-listed in proxy.ts and this
// page has no login gate, by request. WARNING: anyone with the URL can see all
// participants' data — do not treat the deployed URL as secret.
export default async function DashboardPage() {
  const data = await fetchDashboardData()
  const generatedAt = new Date().toISOString()

  return (
    <DashboardShell>
      <DashboardView data={data} generatedAt={generatedAt} />
    </DashboardShell>
  )
}
