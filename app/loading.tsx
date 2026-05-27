import { BrandOrb } from '@/components/brand-orb'
import { LoadingDots } from '@/components/loading-dots'

export default function Loading() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center gap-5 px-6 text-center">
      <BrandOrb size="lg" />
      <LoadingDots />
    </div>
  )
}
