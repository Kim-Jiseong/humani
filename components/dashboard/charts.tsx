'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export const CHART_COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#a855f7', // purple
]

export type Series = { key: string; name: string; color?: string }

const axisProps = {
  stroke: 'currentColor',
  tick: { fontSize: 12, fill: 'currentColor' },
  tickLine: false,
  axisLine: false,
} as const

const tooltipStyle = {
  contentStyle: {
    background: 'var(--color-popover, #fff)',
    border: '1px solid rgba(127,127,127,0.2)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--color-popover-foreground, #111)',
  },
  cursor: { fill: 'rgba(127,127,127,0.08)' },
} as const

/** Grouped/clustered bars — one bar per series, grouped by x category. */
export function GroupedBarChart({
  data,
  series,
  xKey = 'label',
  height = 240,
  valueFormatter,
}: {
  data: Record<string, string | number>[]
  series: Series[]
  xKey?: string
  height?: number
  valueFormatter?: (v: number) => string
}) {
  // recharts' Formatter type is awkward (value can be array/undefined); coerce.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tooltipFormatter: any = valueFormatter
    ? (v: unknown, name: unknown) => [valueFormatter(Number(v)), name]
    : undefined

  return (
    <div className="text-muted-foreground" style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.15)" vertical={false} />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} width={48} />
          <Tooltip {...tooltipStyle} formatter={tooltipFormatter} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Single-series bar chart where each bar gets its own color.
 * - `valueName`: what the bar's number means (shown in the tooltip row).
 * - `labelPrefix`: prepended to the category in the tooltip header so it reads
 *   as a full phrase (e.g. "참가자 #3") instead of repeating the bare axis tick.
 */
export function CountBarChart({
  data,
  height = 220,
  horizontal = false,
  valueName = '값',
  labelPrefix,
}: {
  data: { label: string; count: number }[]
  height?: number
  horizontal?: boolean
  valueName?: string
  labelPrefix?: string
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labelFormatter: any = labelPrefix
    ? (l: unknown) => `${labelPrefix}${l}`
    : undefined

  return (
    <div className="text-muted-foreground" style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 12, left: horizontal ? 8 : -16, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(127,127,127,0.15)" vertical={false} />
          {horizontal ? (
            <>
              <XAxis type="number" {...axisProps} allowDecimals={false} />
              <YAxis type="category" dataKey="label" width={150} {...axisProps} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" {...axisProps} />
              <YAxis {...axisProps} width={40} allowDecimals={false} />
            </>
          )}
          <Tooltip {...tooltipStyle} labelFormatter={labelFormatter} />
          <Bar dataKey="count" name={valueName} radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
