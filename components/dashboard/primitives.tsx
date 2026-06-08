import { cn } from '@/lib/utils'

// Shared presentational bits for the dashboard. No hooks — safe to render from
// either server or client trees.

export function Section({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-0.5">
          <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight sm:text-lg">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            {title}
          </h2>
          {description && (
            <p className="text-xs text-muted-foreground sm:text-sm">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

const ACCENTS: Record<string, string> = {
  default: 'before:bg-foreground/20',
  indigo: 'before:bg-indigo-500',
  emerald: 'before:bg-emerald-500',
  amber: 'before:bg-amber-500',
  cyan: 'before:bg-cyan-500',
  pink: 'before:bg-pink-500',
  slate: 'before:bg-slate-400',
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 'default',
}: {
  label: string
  value: string
  hint?: string
  icon?: React.ReactNode
  accent?: keyof typeof ACCENTS
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-card px-3.5 py-3 ring-1 ring-foreground/10',
        'before:absolute before:inset-y-0 before:left-0 before:w-1',
        ACCENTS[accent],
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function Badge({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'baseline' | 'related' | 'A' | 'B' | 'green' | 'amber'
}) {
  const tones: Record<string, string> = {
    default: 'bg-muted text-muted-foreground',
    baseline: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
    related: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
    A: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    B: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    green: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    amber: 'bg-amber-500/15 text-amber-600 dark:text-amber-300',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

// Shared table cells (used by dashboard-view tables and the SQL result table).
export const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <th className={cn('px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground', className)}>
    {children}
  </th>
)
export const TD = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <td className={cn('px-3 py-2 whitespace-nowrap tabular-nums', className)}>{children}</td>
)

export type SegOption<T extends string> = {
  value: T
  label: string
  icon?: React.ReactNode
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (v: T) => void
  options: SegOption<T>[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'inline-flex flex-wrap gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5',
        className,
      )}
    >
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-background text-foreground shadow-sm ring-1 ring-foreground/10'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  )
}
