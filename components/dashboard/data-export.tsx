'use client'

import { useState } from 'react'
import { AlertTriangle, Database, Download, Play, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Section, Segmented, TH, TD } from '@/components/dashboard/primitives'

// Table names offered for per-table CSV export. Mirrors EXPORT_TABLES in
// lib/db/export.ts (server-only — can't be imported here). The server
// re-validates the name against the allow-list, so this list is UI-only.
const CSV_TABLES = [
  'experiment_participants',
  'experiment_trials',
  'experiment_survey_responses',
  'experiment_suggestions',
  'chat_pause_events',
  'chats',
  'messages',
  'scenario_words',
] as const

type ExportFormat = 'sql' | 'csv'

// Shape returned by /api/dashboard/sql (the exec_read_sql RPC payload).
type SqlOk = { rows: Record<string, unknown>[]; rowCount: number }
type SqlErr = { error: string; code?: string }
type SqlResult = SqlOk | SqlErr

function isErr(r: SqlResult): r is SqlErr {
  return (r as SqlErr).error !== undefined
}

const DISPLAY_ROW_CAP = 500

function inputClasses(extra?: string) {
  // Mirror components/ui/input.tsx so the native select / textarea match.
  return cn(
    'w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none',
    'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
    'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30',
    extra,
  )
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

export function DataExport() {
  const [format, setFormat] = useState<ExportFormat>('sql')
  const [table, setTable] = useState<(typeof CSV_TABLES)[number]>('experiment_participants')

  const [query, setQuery] = useState('select * from experiment_participants limit 20')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SqlResult | null>(null)

  function download() {
    const href =
      format === 'sql'
        ? '/api/dashboard/export?format=sql'
        : `/api/dashboard/export?format=csv&table=${encodeURIComponent(table)}`
    const a = document.createElement('a')
    a.href = href
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function runQuery() {
    setRunning(true)
    setResult(null)
    try {
      const res = await fetch('/api/dashboard/sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = (await res.json()) as SqlResult
      setResult(data)
    } catch (err) {
      setResult({ error: err instanceof Error ? err.message : '요청 실패' })
    } finally {
      setRunning(false)
    }
  }

  const ok = result && !isErr(result) ? result : null
  const errored = result && isErr(result) ? result : null
  const rows = ok ? ok.rows : []
  const columns = rows.length > 0 ? Object.keys(rows[0]) : []
  const shown = rows.slice(0, DISPLAY_ROW_CAP)

  return (
    <div className="space-y-10">
      {/* ---------------- 데이터 다운로드 ---------------- */}
      <Section
        title="데이터 다운로드"
        description="전체 데이터를 SQL 덤프로, 또는 테이블별 CSV로 내려받습니다."
        icon={<Download className="size-4" />}
      >
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">형식</label>
            <Segmented
              value={format}
              onChange={setFormat}
              options={[
                { value: 'sql', label: 'SQL (전체)', icon: <Database className="size-3.5" /> },
                { value: 'csv', label: 'CSV (테이블별)', icon: <Table2 className="size-3.5" /> },
              ]}
            />
          </div>

          {format === 'csv' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">테이블</label>
              <select
                value={table}
                onChange={e => setTable(e.target.value as (typeof CSV_TABLES)[number])}
                className={inputClasses('h-9 min-w-56')}
              >
                {CSV_TABLES.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button onClick={download} className="h-9">
            <Download className="size-4" />
            {format === 'sql' ? '전체 SQL 다운로드' : `${table}.csv 다운로드`}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          SQL 덤프는 모든 실험 테이블 + 채팅(chats·messages)을 INSERT 문으로 내보냅니다
          (scenario_words의 embedding 벡터는 제외).
        </p>
      </Section>

      {/* ---------------- SQL 실행기 ---------------- */}
      <Section
        title="SQL 실행기"
        description="읽기 전용(SELECT · WITH)만 실행됩니다. 쓰기/DDL은 차단됩니다."
        icon={<Database className="size-4" />}
      >
        <div className="space-y-3">
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            spellCheck={false}
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runQuery()
            }}
            placeholder="select * from experiment_participants limit 20"
            className={inputClasses('min-h-32 font-mono text-xs leading-relaxed')}
          />
          <div className="flex items-center gap-3">
            <Button onClick={runQuery} disabled={running || !query.trim()} className="h-9">
              <Play className={cn('size-4', running && 'animate-pulse')} />
              {running ? '실행 중…' : '실행 (⌘/Ctrl+Enter)'}
            </Button>
            {ok && (
              <span className="text-xs text-muted-foreground tabular-nums">
                {ok.rowCount}행
                {ok.rowCount > DISPLAY_ROW_CAP && ` (상위 ${DISPLAY_ROW_CAP}행 표시)`}
              </span>
            )}
          </div>

          {errored && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-0.5">
                <p className="font-medium">쿼리 오류{errored.code ? ` (${errored.code})` : ''}</p>
                <p className="font-mono text-xs break-all">{errored.error}</p>
              </div>
            </div>
          )}

          {ok && rows.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              결과가 없습니다.
            </div>
          )}

          {ok && rows.length > 0 && (
            <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {columns.map(c => (
                      <TH key={c}>{c}</TH>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((row, i) => (
                    <tr key={i} className="border-b last:border-0 hover:bg-muted/40">
                      {columns.map(c => (
                        <TD key={c} className="max-w-80 truncate font-normal">
                          {cellText(row[c])}
                        </TD>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
