import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 10

// One batched write per message (or per page-hide). The client buffers every
// 멈칫 and flushes them together, so this route only inserts arrays — never one
// row per pause. Measurement must NEVER block the UX, so every failure path is
// soft (200 / logged) exactly like /api/suggest.

const Pause = z.object({
  seq: z.number().int().min(1).max(10000),
  durationMs: z.number().int().min(0).max(600_000),
  eojeol: z.string().max(50).optional(),
  words: z.array(z.string().max(50)).max(6).optional(),
})

const Body = z.object({
  chatId: z.string().uuid(),
  trialIndex: z.union([z.literal(1), z.literal(2)]).optional(),
  scenario: z.enum(['A', 'B']).optional(),
  condition: z.enum(['baseline', 'related']).optional(),
  suggestActive: z.boolean(),
  pauses: z.array(Pause).max(1000),
})

const OK = { ok: true } as const

export async function POST(req: Request) {
  let json: unknown
  try {
    // Works for both fetch(JSON) and navigator.sendBeacon(Blob) — both send a
    // JSON body with the auth cookie.
    json = await req.json()
  } catch {
    return Response.json(OK, { status: 400 })
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success) return Response.json(OK, { status: 400 })
  const { chatId, trialIndex, scenario, condition, suggestActive, pauses } =
    parsed.data

  if (pauses.length === 0) return Response.json(OK)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json(OK, { status: 401 })

  const rows = pauses.map(p => ({
    user_id: user.id,
    chat_id: chatId,
    trial_index: trialIndex ?? null,
    scenario: scenario ?? null,
    condition: condition ?? null,
    suggest_active: suggestActive,
    seq: p.seq,
    duration_ms: p.durationMs,
    query_eojeol: p.eojeol ?? null,
    // null = the suggestion fetch did not complete before the pause ended.
    suggested_words: p.words ?? null,
  }))

  const { error } = await supabase.from('chat_pause_events').insert(rows)
  if (error) console.error('[pause-events] insert failed', error)

  return Response.json(OK)
}
