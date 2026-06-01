import { google } from '@ai-sdk/google'
import { embed } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { stripJosa } from '@/lib/suggest/josa'
import {
  EMBEDDING_DIM,
  EMBEDDING_MODEL_ID,
  MIN_QUERY_LEN,
  SUGGEST_THRESHOLD,
} from '@/lib/suggest/config'

export const maxDuration = 15

const Body = z.object({
  scenario: z.enum(['A', 'B']),
  eojeol: z.string().min(1).max(50),
  trialIndex: z.union([z.literal(1), z.literal(2)]),
})

// Returned on every non-success path so typing is NEVER blocked by this feature.
const NONE = { word: null } as const

export async function POST(req: Request) {
  let json: unknown
  try {
    json = await req.json()
  } catch {
    return Response.json(NONE, { status: 400 })
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success) return Response.json(NONE, { status: 400 })
  const { scenario, eojeol, trialIndex } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return Response.json(NONE, { status: 401 })

  // Rule-based 조사 strip; bail cheaply on too-short / non-Hangul stems.
  const stem = stripJosa(eojeol)
  if (stem.length < MIN_QUERY_LEN) return Response.json(NONE)

  // Embed the stem as a retrieval QUERY (asymmetric with the stored DOCUMENTs).
  let embedding: number[]
  try {
    const res = await embed({
      model: google.embedding(EMBEDDING_MODEL_ID),
      value: stem,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIM,
          taskType: 'RETRIEVAL_QUERY',
        },
      },
    })
    embedding = res.embedding
  } catch (err) {
    console.error('[suggest] embed failed', err)
    return Response.json(NONE) // fail soft
  }

  // Vector search via the RPC (scenario filter + threshold gate, server-side).
  // pgvector accepts the text format "[1,2,3]" for the vector arg.
  const { data, error } = await supabase.rpc('match_scenario_words', {
    p_scenario: scenario,
    p_query_embedding: JSON.stringify(embedding),
    p_threshold: SUGGEST_THRESHOLD,
    p_match_count: 1,
  })
  if (error) {
    console.error('[suggest] rpc failed', error)
    return Response.json(NONE)
  }

  const top = (data as { word: string; similarity: number }[] | null)?.[0]
  if (!top) return Response.json(NONE)

  // Log the shown suggestion (own-row RLS). Awaited so the event is never
  // dropped when a serverless instance is reclaimed.
  const { error: logErr } = await supabase.from('experiment_suggestions').insert({
    user_id: user.id,
    trial_index: trialIndex,
    scenario,
    query_eojeol: eojeol,
    query_word: stem,
    suggested_word: top.word,
    similarity: top.similarity,
  })
  if (logErr) console.error('[suggest] log failed', logErr)

  return Response.json({ word: top.word, similarity: top.similarity })
}
