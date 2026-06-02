'use client'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from './primitives'
import { formatInt, formatMs } from '@/lib/dashboard/format'
import {
  TLX_ITEMS,
  WORD_INFLUENCE_OPTIONS,
  WORD_RECOGNITION_OPTIONS,
} from '@/lib/experiment/survey'
import {
  GENDER_OPTIONS,
  LLM_FREQUENCY_OPTIONS,
  SCENARIO_TEXT,
} from '@/lib/experiment/config'
import type { UserDetail, UserTrialDetail } from '@/lib/dashboard/aggregate'

const recLabel = Object.fromEntries(
  WORD_RECOGNITION_OPTIONS.map(o => [o.value, o.label]),
)
const infLabel = Object.fromEntries(
  WORD_INFLUENCE_OPTIONS.map(o => [o.value, o.label]),
)
const genderLabel = Object.fromEntries(GENDER_OPTIONS.map(o => [o.value, o.label]))
const freqLabel = Object.fromEntries(LLM_FREQUENCY_OPTIONS.map(o => [o.value, o.label]))

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour12: false })
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}

function TrialBlock({ d }: { d: UserTrialDetail }) {
  const { trial, pause, events, survey, suggestions } = d
  const isRelated = trial.condition === 'related'

  return (
    <div className="space-y-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">Trial {trial.trialIndex}</span>
        <Badge tone={trial.scenario}>시나리오 {trial.scenario}</Badge>
        <Badge tone={trial.condition}>{trial.condition}</Badge>
        <span className="text-xs text-muted-foreground">
          {SCENARIO_TEXT[trial.scenario].title}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        <MiniStat label="중지 수" value={formatInt(pause.count)} />
        <MiniStat label="평균" value={formatMs(pause.avgMs)} />
        <MiniStat label="중앙" value={formatMs(pause.medianMs)} />
        <MiniStat label="총합" value={formatMs(pause.sumMs)} />
        <MiniStat label="최소" value={formatMs(pause.minMs)} />
        <MiniStat label="최대" value={formatMs(pause.maxMs)} />
      </div>

      {/* Survey */}
      <div className="space-y-1.5 text-xs">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {TLX_ITEMS.map(item => (
            <span key={item.key} className="text-muted-foreground">
              {item.title}:{' '}
              <span className="font-medium text-foreground tabular-nums">
                {survey?.[item.key] ?? '–'}
              </span>
            </span>
          ))}
        </div>
        {isRelated && (
          <div className="space-y-0.5 text-muted-foreground">
            <div>
              단어 인지:{' '}
              <span className="text-foreground">
                {survey?.word_recognition
                  ? recLabel[survey.word_recognition]
                  : '–'}
              </span>
            </div>
            <div>
              단어 영향:{' '}
              <span className="text-foreground">
                {survey?.word_influence ? infLabel[survey.word_influence] : '–'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Pause events */}
      {events.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-md border-collapse text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="px-2 py-1.5 text-left font-medium">#</th>
                <th className="px-2 py-1.5 text-left font-medium">시각</th>
                <th className="px-2 py-1.5 text-left font-medium">어절</th>
                <th className="px-2 py-1.5 text-right font-medium">지속</th>
                <th className="px-2 py-1.5 text-left font-medium">제시 단어</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                    {e.seq}
                  </td>
                  <td className="px-2 py-1.5 tabular-nums text-muted-foreground">
                    {clock(e.createdAt)}
                  </td>
                  <td className="px-2 py-1.5">{e.queryEojeol ?? '–'}</td>
                  <td className="px-2 py-1.5 text-right font-medium tabular-nums">
                    {formatMs(e.durationMs)}
                  </td>
                  <td className="px-2 py-1.5 text-muted-foreground">
                    {e.suggestedWords?.length ? e.suggestedWords.join(', ') : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="text-xs text-muted-foreground">
          단어 추천 로그 {suggestions.length}건 ·{' '}
          {suggestions.map(s => s.queryWord).slice(0, 8).join(', ')}
          {suggestions.length > 8 ? ' …' : ''}
        </div>
      )}
    </div>
  )
}

export function UserDetailSheet({
  detail,
  open,
  onOpenChange,
}: {
  detail: UserDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        {detail && (
          <>
            <SheetHeader className="border-b">
              <SheetTitle className="flex items-center gap-2">
                참가자 #{detail.participant.seq}
                {detail.participant.completedAt ? (
                  <Badge tone="green">완료</Badge>
                ) : (
                  <Badge tone="amber">진행중</Badge>
                )}
              </SheetTitle>
              <SheetDescription>
                {detail.participant.userId} · 그룹 {detail.participant.groupType} ·{' '}
                {detail.participant.age}세 ·{' '}
                {genderLabel[detail.participant.gender]} · LLM{' '}
                {freqLabel[detail.participant.llmFrequency]}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-3 p-4">
              <div className="grid grid-cols-4 gap-1.5">
                <MiniStat label="총 중지" value={formatInt(detail.totalPause.count)} />
                <MiniStat label="평균" value={formatMs(detail.totalPause.avgMs)} />
                <MiniStat label="중앙" value={formatMs(detail.totalPause.medianMs)} />
                <MiniStat label="총합" value={formatMs(detail.totalPause.sumMs)} />
              </div>
              {detail.trials.map(t => (
                <TrialBlock key={t.trial.trialIndex} d={t} />
              ))}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
