import { cn } from '@/lib/utils'

export function LoadingDots({
  className,
  label = '로딩 중',
}: {
  className?: string
  label?: string
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('flex items-center gap-1.5', className)}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-brand-1"
        style={{ animation: 'brand-pulse 1.2s ease-in-out -0.3s infinite' }}
      />
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-brand-2"
        style={{ animation: 'brand-pulse 1.2s ease-in-out -0.15s infinite' }}
      />
      <span
        aria-hidden
        className="size-1.5 rounded-full bg-brand-3"
        style={{ animation: 'brand-pulse 1.2s ease-in-out 0s infinite' }}
      />
    </div>
  )
}
