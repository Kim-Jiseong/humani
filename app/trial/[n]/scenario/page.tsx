import { notFound } from 'next/navigation'
import { TriangleAlert } from 'lucide-react'
import { requireStep } from '@/lib/experiment/guard'
import { ExperimentShell } from '@/components/experiment/experiment-shell'
import { ScenarioConfirm } from '@/components/experiment/scenario-confirm'
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
      <div className="flex flex-1 flex-col gap-5 py-6">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">
            {trialIndex}차 실험 시나리오
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {scenario.title}
          </h1>
        </div>

        <div className="glass space-y-4 rounded-2xl px-5 py-5">
          <p className="text-[15px] leading-relaxed">{scenario.body}</p>
          <dl className="space-y-2 border-t border-foreground/10 pt-4 text-sm">
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 font-medium text-muted-foreground">
                주제
              </dt>
              <dd>{scenario.topic}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-14 shrink-0 font-medium text-muted-foreground">
                산출물
              </dt>
              <dd>{scenario.output}</dd>
            </div>
          </dl>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {scenario.note}
          </p>
        </div>

        <div className="flex items-start gap-2.5 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div className="space-y-1">
            <p>
              다음 화면으로 넘어가면 시나리오를 다시 볼 수 없으니, 충분히 숙지해
              주세요.
            </p>
            <p>채팅은 딱 1번만 입력할 수 있습니다.</p>
          </div>
        </div>

        <div className="mt-auto pt-2">
          <ScenarioConfirm step={step} />
        </div>
      </div>
    </ExperimentShell>
  )
}
