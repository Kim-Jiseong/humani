import { notFound } from 'next/navigation'
import { requireStep } from '@/lib/experiment/guard'
import { getTrial } from '@/lib/db/experiment'
import { ExperimentShell } from '@/components/experiment/experiment-shell'
import { ProgressBar } from '@/components/experiment/progress-bar'
import { PostTrialSurveyForm } from '@/components/experiment/post-trial-survey-form'
import { parseTrialIndex, trialStep } from '@/lib/experiment/config'

export default async function TrialSurveyPage({
  params,
}: {
  params: Promise<{ n: string }>
}) {
  const { n } = await params
  const trialIndex = parseTrialIndex(n)
  if (!trialIndex) notFound()

  await requireStep(trialStep('survey', trialIndex))

  // condition decides whether the two "연관" items are shown/required.
  const trial = await getTrial(trialIndex)
  const isRelated = trial?.condition === 'related'
  const percent = trialIndex === 1 ? 50 : 100

  return (
    <ExperimentShell>
      <div className="flex flex-1 flex-col gap-6 py-6">
        <div className="space-y-3">
          <ProgressBar percent={percent} />
          <h1 className="text-2xl font-semibold tracking-tight">
            사후 설문 조사
          </h1>
        </div>
        <PostTrialSurveyForm trialIndex={trialIndex} isRelated={isRelated} />
      </div>
    </ExperimentShell>
  )
}
