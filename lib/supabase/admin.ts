import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. **Server-only** — bypasses RLS, so it can read
 * every participant's rows (the cookie client in `./server` only ever sees the
 * caller's own rows). Never import this from a client component, and never pass
 * the client or its key across the server/client boundary.
 *
 * Mirrors the seed-script pattern (scripts/seed-scenario-words.ts).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).',
    )
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  })
}
