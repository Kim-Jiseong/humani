import { requireSurveyStep } from '@/lib/experiment/guard'
import { ExperimentShell } from '@/components/experiment/experiment-shell'
import { SurveyForm } from '@/components/experiment/survey-form'

export default async function SurveyPage() {
  await requireSurveyStep()

  return (
    <ExperimentShell>
      <div className="flex flex-1 flex-col justify-center gap-7 py-8">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">사전 설문 조사</h1>
          <p className="text-sm text-muted-foreground">
            실험 시작 전, 아래 정보를 입력해 주세요.
          </p>
        </div>
        <SurveyForm />
      </div>
    </ExperimentShell>
  )
}
