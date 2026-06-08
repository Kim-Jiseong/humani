import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAll } from '@/lib/db/dashboard'
import {
  EXPORT_TABLES,
  EXPORT_TABLE_ORDER,
  buildCsv,
  buildInsertBlock,
  isExportTable,
  type ExportTable,
} from '@/lib/db/export'

// READ-ONLY data export for the dashboard. Reads via the service-role client
// (RLS bypassed); only ever calls .select() through fetchAll. Never cached.
// Access is OPEN (matches /dashboard, by request).
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Windows-safe filename stamp (no colons): 2026-06-08T1530.
function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/:/g, '')
}

function attachment(body: string, contentType: string, filename: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const format = url.searchParams.get('format') ?? 'sql'
  const supabase = createAdminClient()

  // ---- CSV: one table -----------------------------------------------------
  if (format === 'csv') {
    const table = url.searchParams.get('table') ?? ''
    if (!isExportTable(table)) {
      return Response.json(
        { error: `Unknown table: ${table}` },
        { status: 400 },
      )
    }
    const rows = (await fetchAll(
      supabase,
      table,
      EXPORT_TABLES[table].columns.join(', '),
    )) as Record<string, unknown>[]
    return attachment(
      buildCsv(table, rows),
      'text/csv; charset=utf-8',
      `${table}-${stamp()}.csv`,
    )
  }

  // ---- SQL: full dump -----------------------------------------------------
  // Buffered string is fine at the current data scale. If dumps grow past the
  // platform response limit, switch to a streaming ReadableStream that flushes
  // per table.
  const blocks = await Promise.all(
    EXPORT_TABLE_ORDER.map(async (table: ExportTable) => {
      const rows = (await fetchAll(
        supabase,
        table,
        EXPORT_TABLES[table].columns.join(', '),
      )) as Record<string, unknown>[]
      return buildInsertBlock(table, rows)
    }),
  )

  const head =
    `-- semantic-word-cloud-chat data dump\n` +
    `-- generated: ${new Date().toISOString()}\n` +
    `-- READ-ONLY export. Re-import order matches table dependencies.\n\n`
  const body = head + blocks.join('\n')

  return attachment(body, 'application/sql; charset=utf-8', `dashboard-dump-${stamp()}.sql`)
}
