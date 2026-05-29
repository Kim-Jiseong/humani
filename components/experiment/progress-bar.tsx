import { cn } from '@/lib/utils'

/** Thin branded progress bar. Pure CSS — renders on the server. */
export function ProgressBar({
  percent,
  className,
}: {
  percent: number
  className?: string
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)))
  return (
    <div className={cn('w-full', className)}>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-muted/60 ring-1 ring-foreground/10"
      >
        <div
          className="bg-brand-gradient shadow-glow-brand h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="mt-1.5 text-right text-xs text-muted-foreground">
        {clamped}% 완료
      </p>
    </div>
  )
}
