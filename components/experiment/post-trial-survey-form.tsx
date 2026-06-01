'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { submitTrialSurveyAction } from '@/app/actions/experiment'
import type { TrialIndex } from '@/lib/experiment/config'
import {
  RELATED_QUESTIONS,
  TLX_ITEMS,
  TLX_MAX,
  TLX_MIN,
  TLX_STEP,
  trialOrdinalLabel,
  type TlxItem,
  type TlxKey,
  type TrialSurveyAnswers,
  type WordInfluence,
  type WordRecognition,
} from '@/lib/experiment/survey'

const DEFAULT_TLX = 50

function TlxSlider({
  item,
  value,
  touched,
  onChange,
}: {
  item: TlxItem
  value: number
  touched: boolean
  onChange: (v: number) => void
}) {
  return (
    <div className="glass space-y-3 rounded-2xl px-4 py-4">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[15px] font-semibold">{item.title}</h3>
          <span
            className={cn(
              'shrink-0 text-base font-bold tabular-nums',
              touched ? 'text-brand-gradient' : 'text-muted-foreground/40',
            )}
          >
            {touched ? value : '—'}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {item.description}
        </p>
      </div>
      <input
        type="range"
        min={TLX_MIN}
        max={TLX_MAX}
        step={TLX_STEP}
        value={value}
        aria-label={item.title}
        // Mark "touched" even when the value doesn't change (e.g. tapping the
        // current position), so an intentional midpoint answer still counts.
        onPointerDown={() => onChange(value)}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full cursor-pointer py-1"
        style={{ accentColor: 'var(--brand-2)' }}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{item.lowLabel}</span>
        <span>{item.highLabel}</span>
      </div>
    </div>
  )
}

function RadioGroup({
  title,
  options,
  value,
  onSelect,
}: {
  title: string
  options: readonly { value: string; label: string }[]
  value: string | null
  onSelect: (v: string) => void
}) {
  return (
    <div className="glass space-y-3 rounded-2xl px-4 py-4">
      <h3 className="text-[15px] font-semibold leading-snug">{title}</h3>
      <div className="space-y-2">
        {options.map(o => {
          const selected = value === o.value
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onSelect(o.value)}
              aria-pressed={selected}
              className={cn(
                'flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                selected
                  ? 'border-transparent bg-brand-gradient text-white shadow-glow-brand'
                  : 'border-foreground/12 bg-foreground/[0.03] hover:bg-foreground/[0.06]',
              )}
            >
              <span
                className={cn(
                  'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2',
                  selected ? 'border-white' : 'border-muted-foreground/40',
                )}
              >
                {selected && (
                  <span className="size-1.5 rounded-full bg-white" />
                )}
              </span>
              <span className="leading-snug">{o.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function PostTrialSurveyForm({
  trialIndex,
  isRelated,
}: {
  trialIndex: TrialIndex
  isRelated: boolean
}) {
  const [values, setValues] = useState<Record<TlxKey, number>>(
    () =>
      Object.fromEntries(
        TLX_ITEMS.map(i => [i.key, DEFAULT_TLX]),
      ) as Record<TlxKey, number>,
  )
  const [touched, setTouched] = useState<Record<TlxKey, boolean>>(
    () =>
      Object.fromEntries(
        TLX_ITEMS.map(i => [i.key, false]),
      ) as Record<TlxKey, boolean>,
  )
  const [wordRecognition, setWordRecognition] =
    useState<WordRecognition | null>(null)
  const [wordInfluence, setWordInfluence] = useState<WordInfluence | null>(null)
  const [pending, startTransition] = useTransition()

  function setTlx(key: TlxKey, v: number) {
    setValues(prev => ({ ...prev, [key]: v }))
    setTouched(prev => (prev[key] ? prev : { ...prev, [key]: true }))
  }

  const allTlxTouched = TLX_ITEMS.every(i => touched[i.key])
  const relatedDone =
    !isRelated || (wordRecognition !== null && wordInfluence !== null)
  const complete = allTlxTouched && relatedDone

  function handleSubmit() {
    if (!complete || pending) return
    const answers: TrialSurveyAnswers = { ...values }
    if (isRelated) {
      answers.word_recognition = wordRecognition ?? undefined
      answers.word_influence = wordInfluence ?? undefined
    }
    startTransition(async () => {
      await submitTrialSurveyAction(trialIndex, answers)
    })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        직전에 진행한{' '}
        <span className="font-medium text-foreground">
          {trialOrdinalLabel(trialIndex)} 프롬프트(채팅) 작성 과제
        </span>
        에 한해 답변해 주세요.
      </p>

      {TLX_ITEMS.map(item => (
        <TlxSlider
          key={item.key}
          item={item}
          value={values[item.key]}
          touched={touched[item.key]}
          onChange={v => setTlx(item.key, v)}
        />
      ))}

      {isRelated && (
        <>
          <RadioGroup
            title={RELATED_QUESTIONS[0].title}
            options={RELATED_QUESTIONS[0].options}
            value={wordRecognition}
            onSelect={v => setWordRecognition(v as WordRecognition)}
          />
          <RadioGroup
            title={RELATED_QUESTIONS[1].title}
            options={RELATED_QUESTIONS[1].options}
            value={wordInfluence}
            onSelect={v => setWordInfluence(v as WordInfluence)}
          />
        </>
      )}

      {!complete && (
        <p className="text-center text-xs text-muted-foreground">
          모든 항목에 응답해 주세요.
        </p>
      )}

      <Button
        type="button"
        variant="brand"
        disabled={!complete || pending}
        aria-busy={pending}
        onClick={handleSubmit}
        className="h-11 w-full rounded-2xl text-[15px] font-semibold"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {trialIndex === 1 ? '다음' : '제출하고 마치기'}
      </Button>
    </div>
  )
}
