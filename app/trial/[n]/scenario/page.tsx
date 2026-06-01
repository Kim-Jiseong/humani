import { notFound } from 'next/navigation'
import { requireStep } from '@/lib/experiment/guard'
import { ExperimentShell } from '@/components/experiment/experiment-shell'
import {
  OneShotNotice,
  ScenarioView,
} from '@/components/experiment/scenario-view'
import { AdvanceButton } from '@/components/experiment/advance-button'
import {
  SCENARIO_TEXT,
  parseTrialIndex,
  planFor,
  trialStep,
} from '@/lib/experiment/config'

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ n: string }>
}) {
  const { n } = await params
  const trialIndex = parseTrialIndex(n)
  if (!trialIndex) notFound()

  const step = trialStep('scenario', trialIndex)
  const participant = await requireStep(step)
  const plan = planFor(participant.groupType, trialIndex)
  const scenario = SCENARIO_TEXT[plan.scenario]

  return (
    <ExperimentShell>
      <ScenarioView
        trialIndex={trialIndex}
        scenario={scenario}
        notice={<OneShotNotice />}
        footer={<AdvanceButton step={step} label="다음" />}
      />
    </ExperimentShell>
  )
}
