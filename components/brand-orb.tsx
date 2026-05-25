import { cn } from '@/lib/utils'

const sizeMap = {
  sm: 'size-5',
  md: 'size-8',
  lg: 'size-16',
} as const

export function BrandOrb({
  size = 'md',
  glow = true,
  className,
}: {
  size?: keyof typeof sizeMap
  glow?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-block shrink-0 rounded-full',
        sizeMap[size],
        className,
      )}
      style={{
        backgroundImage:
          'conic-gradient(from 140deg, var(--brand-1), var(--brand-2), var(--brand-3), var(--brand-4), var(--brand-1))',
        boxShadow: glow
          ? 'var(--glow-brand-strong), inset 0 1px 0 oklch(1 0 0 / 35%), inset 0 -1px 0 oklch(0 0 0 / 20%)'
          : 'inset 0 1px 0 oklch(1 0 0 / 35%), inset 0 -1px 0 oklch(0 0 0 / 20%)',
      }}
    />
  )
}
