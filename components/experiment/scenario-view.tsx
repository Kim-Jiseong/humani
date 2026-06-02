import { Info } from 'lucide-react'
import type { ScenarioContent, TrialIndex } from '@/lib/experiment/config'

/** Render `note`, highlighting the `emphasis` keyword phrase in blue bold. */
function EmphasizedNote({ note, emphasis }: { note: string; emphasis: string }) {
  const idx = emphasis ? note.indexOf(emphasis) : -1
  if (idx === -1) return <>{note}</>
  return (
    <>
      {note.slice(0, idx)}
      <strong className="font-semibold text-blue-600 dark:text-blue-400">
        {emphasis}
      </strong>
      {note.slice(idx + emphasis.length)}
    </>
  )
}

/** Reminder shown on the scenario screen and the chat recap. */
export function OneShotNotice() {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-foreground/10 bg-foreground/[0.03] px-4 py-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" />
      <p>
        채팅은 딱 1번만 입력할 수 있어요. 시나리오를 충분히 숙지한 뒤 시작해
        주세요.
      </p>
    </div>
  )
}

/**
 * Presentational scenario card — reused by the scenario step page and by the
 * chat recap screen (shown before composing, including on re-entry). `footer`
 * holds the call-to-action button.
 */
export function ScenarioView({
  trialIndex,
  scenario,
  notice,
  footer,
}: {
  trialIndex: TrialIndex
  scenario: ScenarioContent
  notice?: React.ReactNode
  footer: React.ReactNode
}) {
  return (
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
          <EmphasizedNote note={scenario.note} emphasis={scenario.noteEmphasis} />
        </p>
      </div>

      {notice}

      <div className="mt-auto pt-2">{footer}</div>
    </div>
  )
}
