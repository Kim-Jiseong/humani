/**
 * One-time (idempotent) seed: embed the prepared per-scenario vocabulary CSVs
 * and upsert them into public.scenario_words.
 *
 * Run AFTER applying lib/db/pgvector.schema.sql + lib/db/scenario-words.schema.sql:
 *   npm run seed:words
 * (package.json wires this to: tsx scripts/seed-scenario-words.ts)
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { google } from '@ai-sdk/google'
import { embedMany } from 'ai'
import { EMBEDDING_DIM, EMBEDDING_MODEL_ID } from '../lib/suggest/config'

const SCENARIOS = ['A', 'B'] as const
const CHUNK = 100 // well under gemini-embedding-001's 2048/call limit; chunked for progress

// Minimal hand-written schema so the typed client accepts our upsert (no
// generated Database types in this project).
type ScenarioWordInsert = {
  scenario: string
  category: string
  word: string
  embedding: string
}
type Database = {
  public: {
    Tables: {
      scenario_words: {
        Row: ScenarioWordInsert & { id: number; created_at: string }
        Insert: ScenarioWordInsert
        Update: Partial<ScenarioWordInsert>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type Row = { scenario: 'A' | 'B'; category: string; word: string }

/** Load .env.local into process.env without any dependency (so `tsx` alone works). */
function loadEnvLocal() {
  const path = join(process.cwd(), '.env.local')
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (line.trimStart().startsWith('#')) continue
    const m = /^\s*([\w.-]+)\s*=\s*(.*?)\s*$/.exec(line)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}

function parseCsv(scenario: 'A' | 'B'): Row[] {
  const path = join(
    process.cwd(),
    'public',
    'word-data',
    `scenario_${scenario}_vocabulary.csv`,
  )
  const raw = readFileSync(path, 'utf8').replace(/^﻿/, '') // strip UTF-8 BOM
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  lines.shift() // drop "카테고리,단어" header
  return lines.map(line => {
    const [category, word] = line.split(',')
    return { scenario, category: category.trim(), word: word.trim() }
  })
}

/** Embed words in chunks, returning pgvector text-format strings ("[1,2,...]"). */
async function embedWords(words: string[]): Promise<string[]> {
  const model = google.embedding(EMBEDDING_MODEL_ID)
  const out: string[] = []
  for (let i = 0; i < words.length; i += CHUNK) {
    const slice = words.slice(i, i + CHUNK)
    const { embeddings } = await embedMany({
      model,
      values: slice,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIM,
          taskType: 'RETRIEVAL_DOCUMENT',
        },
      },
    })
    for (const e of embeddings) out.push(JSON.stringify(e))
    console.log(`  embedded ${Math.min(i + CHUNK, words.length)}/${words.length}`)
  }
  return out
}

async function main() {
  loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (.env.local).',
    )
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error('Missing GOOGLE_GENERATIVE_AI_API_KEY (.env.local).')
  }

  // service_role bypasses RLS for the reference-table write.
  const supabase = createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  })

  for (const scenario of SCENARIOS) {
    const rows = parseCsv(scenario)
    console.log(`scenario ${scenario}: ${rows.length} words`)
    const embeddings = await embedWords(rows.map(r => r.word))
    const records: ScenarioWordInsert[] = rows.map((r, i) => ({
      scenario: r.scenario,
      category: r.category,
      word: r.word,
      embedding: embeddings[i],
    }))
    const { error } = await supabase
      .from('scenario_words')
      .upsert(records, { onConflict: 'scenario,word' })
    if (error) throw error
    console.log(`✓ scenario ${scenario}: upserted ${records.length} words`)
  }
  console.log('done.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
