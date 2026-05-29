import { requireStep } from '@/lib/experiment/guard'
import { ExperimentShell } from '@/components/experiment/experiment-shell'
import { ProgressBar } from '@/components/experiment/progress-bar'
import { BrandOrb } from '@/components/brand-orb'

export default async function DonePage() {
  await requireStep('done')

  return (
    <ExperimentShell>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 py-8 text-center">
        <BrandOrb size="lg" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            실험이 완료되었습니다
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            참여해 주셔서 감사합니다.
          </p>
        </div>
        <ProgressBar percent={100} className="max-w-xs" />
      </div>
    </ExperimentShell>
  )
}
