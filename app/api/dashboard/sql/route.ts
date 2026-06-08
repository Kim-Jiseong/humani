import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

// READ-ONLY ad-hoc SQL runner for the dashboard. Delegates to the
// `exec_read_sql` RPC (lib/db/dashboard-exec-sql.schema.sql), which enforces
// read-only at the Postgres engine level (set local transaction_read_only).
// Called with the service-role client (the RPC is granted only to service_role).
// Access is OPEN (matches /dashboard, by request) — see the .sql file's
// exposure warning.
export const dynamic = 'force-dynamic'
export const maxDuration = 15

const Body = z.object({ query: z.string().min(1).max(20000) })

export async function POST(req: Request) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body', code: 'BADREQ' }, { status: 400 })
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: 'query is required (max 20000 chars)', code: 'BADREQ' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('exec_read_sql', { query: parsed.data.query })

  if (error) {
    // Transport / RPC-level failure (e.g. function not applied yet).
    return Response.json({ error: error.message, code: error.code ?? 'RPC' })
  }

  // The RPC returns either { rows, rowCount } or { error, code }. Pass through
  // verbatim with status 200 so the client renders query-level errors inline.
  return Response.json(data ?? { rows: [], rowCount: 0 })
}
