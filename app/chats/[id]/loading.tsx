import { BrandOrb } from '@/components/brand-orb'
import { LoadingDots } from '@/components/loading-dots'

export default function Loading() {
  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b border-glass-border bg-glass px-3 backdrop-blur-xl backdrop-saturate-150">
        <h1 className="text-brand-gradient pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold tracking-tight">
          Humani
        </h1>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <BrandOrb size="md" />
        <LoadingDots label="대화 불러오는 중" />
      </main>
    </div>
  )
}
