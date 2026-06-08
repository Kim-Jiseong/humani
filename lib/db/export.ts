import 'server-only'

// Server-only data-export helpers for the dashboard. READ-ONLY: every consumer
// only ever calls supabase `.select()` (via fetchAll). Nothing here mutates the
// database. Two output formats:
//   * SQL dump  — INSERT statements for the whole project (full re-import).
//   * CSV       — one table at a time (chosen in the UI).
//
// PostgREST returns ALREADY-PARSED JS values (jsonb -> object, arrays -> JS
// array, timestamps -> ISO string). We re-serialize those back to valid
// Postgres literals / CSV cells. Serialization is driven by the per-column type
// map below, NOT by guessing from the runtime value (a bare JS array is
// indistinguishable between text[], float8[] and a jsonb array).

type PgType = 'text' | 'int' | 'bool' | 'timestamptz' | 'jsonb' | 'text[]' | 'float8[]'

type TableSpec = {
  columns: string[]
  types: Record<string, PgType>
}

// Allow-list. The export route NEVER passes an unvalidated table name to
// `.from()` — only keys of this object are accepted. Columns mirror the live
// schema (lib/db/*.schema.sql). `scenario_words.embedding` (768-dim vector) is
// intentionally EXCLUDED — huge and not experiment output.
export const EXPORT_TABLES = {
  chats: {
    columns: ['id', 'user_id', 'title', 'created_at', 'updated_at'],
    types: { created_at: 'timestamptz', updated_at: 'timestamptz' },
  },
  messages: {
    columns: ['id', 'chat_id', 'client_id', 'position', 'role', 'parts', 'created_at'],
    types: { position: 'int', parts: 'jsonb', created_at: 'timestamptz' },
  },
  experiment_participants: {
    columns: [
      'user_id', 'seq', 'group_type', 'age', 'gender', 'llm_frequency',
      'current_step', 'created_at', 'updated_at', 'completed_at',
    ],
    types: {
      seq: 'int', group_type: 'int', age: 'int',
      created_at: 'timestamptz', updated_at: 'timestamptz', completed_at: 'timestamptz',
    },
  },
  experiment_trials: {
    columns: ['id', 'user_id', 'trial_index', 'scenario', 'condition', 'chat_id', 'created_at', 'submitted_at'],
    types: { trial_index: 'int', created_at: 'timestamptz', submitted_at: 'timestamptz' },
  },
  experiment_survey_responses: {
    columns: ['id', 'user_id', 'trial_index', 'answers', 'created_at'],
    types: { trial_index: 'int', answers: 'jsonb', created_at: 'timestamptz' },
  },
  experiment_suggestions: {
    columns: [
      'id', 'user_id', 'trial_index', 'scenario', 'query_eojeol', 'query_word',
      'suggested_words', 'similarities', 'created_at',
    ],
    types: {
      trial_index: 'int', suggested_words: 'text[]', similarities: 'float8[]',
      created_at: 'timestamptz',
    },
  },
  chat_pause_events: {
    columns: [
      'id', 'user_id', 'chat_id', 'trial_index', 'scenario', 'condition',
      'suggest_active', 'seq', 'duration_ms', 'query_eojeol', 'suggested_words', 'created_at',
    ],
    types: {
      trial_index: 'int', suggest_active: 'bool', seq: 'int', duration_ms: 'int',
      suggested_words: 'text[]', created_at: 'timestamptz',
    },
  },
  scenario_words: {
    columns: ['id', 'scenario', 'category', 'word', 'created_at'], // embedding excluded
    types: { id: 'int', created_at: 'timestamptz' },
  },
} satisfies Record<string, TableSpec>

export type ExportTable = keyof typeof EXPORT_TABLES

export function isExportTable(name: string): name is ExportTable {
  return Object.prototype.hasOwnProperty.call(EXPORT_TABLES, name)
}

// Order tables so a re-import satisfies FKs: chats before messages /
// experiment_trials; scenario_words has no FK in.
export const EXPORT_TABLE_ORDER: ExportTable[] = [
  'scenario_words',
  'experiment_participants',
  'chats',
  'experiment_trials',
  'messages',
  'chat_pause_events',
  'experiment_suggestions',
  'experiment_survey_responses',
]

// ---------------------------------------------------------------------------
// Postgres-literal serialization (for the SQL dump)
// ---------------------------------------------------------------------------

function quoteString(s: string): string {
  // standard_conforming_strings is on by default → only ' needs doubling.
  return `'${s.replace(/'/g, "''")}'`
}

function arrayLiteral(value: unknown[], elem: 'text' | 'float8'): string {
  if (value.length === 0) return `ARRAY[]::${elem}[]`
  const parts = value.map(v => {
    if (v === null || v === undefined) return 'NULL'
    if (elem === 'float8') {
      const n = Number(v)
      return Number.isFinite(n) ? String(n) : 'NULL'
    }
    return quoteString(String(v))
  })
  return `ARRAY[${parts.join(', ')}]::${elem}[]`
}

/** JS value (as returned by PostgREST) → a valid Postgres literal. */
export function toPgLiteral(value: unknown, type: PgType): string {
  if (value === null || value === undefined) return 'NULL'

  switch (type) {
    case 'bool':
      return value ? 'true' : 'false'
    case 'int': {
      const n = Number(value)
      return Number.isFinite(n) ? String(n) : 'NULL'
    }
    case 'timestamptz':
      return `${quoteString(String(value))}::timestamptz`
    case 'jsonb':
      // Re-stringify objects; pass through strings already holding JSON.
      return `${quoteString(typeof value === 'string' ? value : JSON.stringify(value))}::jsonb`
    case 'text[]':
      return arrayLiteral(Array.isArray(value) ? value : [], 'text')
    case 'float8[]':
      return arrayLiteral(Array.isArray(value) ? value : [], 'float8')
    case 'text':
    default: {
      if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
      if (typeof value === 'boolean') return value ? 'true' : 'false'
      const s = String(value)
      // bigints arrive as numeric strings for text-typed numeric columns; keep
      // them quoted (the column is text/uuid). Plain quoting is always safe.
      return quoteString(s)
    }
  }
}

/** Build the INSERT block for one table. Rows are batched to keep statements sane. */
export function buildInsertBlock(
  table: ExportTable,
  rows: Record<string, unknown>[],
): string {
  const { columns } = EXPORT_TABLES[table]
  // `satisfies` keeps each table's `types` as a narrow literal shape; widen for
  // the per-column lookup below.
  const types = EXPORT_TABLES[table].types as Record<string, PgType>
  const header = `-- Table: ${table} (${rows.length} rows)\n`
  if (rows.length === 0) return `${header}-- (no rows)\n`

  const colList = columns.join(', ')
  const BATCH = 500
  const chunks: string[] = []
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH)
    const values = slice
      .map(row => {
        const cells = columns.map(c => toPgLiteral(row[c], types[c] ?? 'text'))
        return `  (${cells.join(', ')})`
      })
      .join(',\n')
    chunks.push(`INSERT INTO public.${table} (${colList}) VALUES\n${values};`)
  }
  return `${header}${chunks.join('\n')}\n`
}

// ---------------------------------------------------------------------------
// CSV serialization (one table)
// ---------------------------------------------------------------------------

export const CSV_BOM = '﻿' // so Excel renders Hangul correctly

function toCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s =
    Array.isArray(value) || (typeof value === 'object')
      ? JSON.stringify(value)
      : String(value)
  return /["\n\r,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function buildCsv(table: ExportTable, rows: Record<string, unknown>[]): string {
  const { columns } = EXPORT_TABLES[table]
  const lines = [columns.join(',')]
  for (const row of rows) {
    lines.push(columns.map(c => toCsvCell(row[c])).join(','))
  }
  return CSV_BOM + lines.join('\r\n')
}
