import { notFound } from 'next/navigation'
import { requireStep } from '@/lib/experiment/guard'
import { ExperimentShell } from '@/components/experiment/experiment-shell'
import { AdvanceButton } from '@/components/experiment/advance-button'
import { ProgressBar } from '@/components/experiment/progress-bar'
import { parseTrialIndex, trialStep } from '@/lib/experiment/config'

export default async function TrialSurveyPage({
  params,
}: {
  params: Promise<{ n: string }>
}) {
  const { n } = await params
  const trialIndex = parseTrialIndex(n)
  if (!trialIndex) notFound()

  const step = trialStep('survey', trialIndex)
  await requireStep(step)

  const percent = trialIndex === 1 ? 50 : 100
  const label = trialIndex === 1 ? '다음' : '제출하고 마치기'

  return (
    <ExperimentShell>
      <div className="flex flex-1 flex-col justify-center gap-8 py-8">
        <ProgressBar percent={percent} />

        <div className="glass space-y-2 rounded-2xl px-5 py-7 text-center">
          <h1 className="text-xl font-semibold tracking-tight">사후 설문 조사</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            설문은 추후 제공될 예정입니다.
            <br />
            아래 버튼을 눌러 계속 진행해 주세요.
          </p>
        </div>

        <AdvanceButton step={step} label={label} />
      </div>
    </ExperimentShell>
  )
}
