import { cn } from '@/lib/utils'
import { CONDITION_LABEL } from '@/lib/experiment/config'

/**
 * Marks the "연관(related)" condition. The related feature itself is deferred —
 * for now this badge is the only visible difference from the baseline condition.
 */
export function ConditionBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'glass inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      <span className="bg-brand-gradient size-1.5 rounded-full" aria-hidden />
      {CONDITION_LABEL.related}
    </span>
  )
}
