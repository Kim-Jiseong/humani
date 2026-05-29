'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { submitSurveyAction } from '@/app/actions/experiment'
import {
  GENDER_OPTIONS,
  LLM_FREQUENCY_OPTIONS,
  type Gender,
  type LlmFrequency,
} from '@/lib/experiment/config'

function SelectablePill({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex h-11 items-center justify-center rounded-xl px-4 text-[15px] font-medium transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        selected
          ? 'bg-brand-gradient text-white shadow-glow-brand'
          : 'glass text-foreground hover:shadow-glow-brand',
      )}
    >
      {children}
    </button>
  )
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="brand"
      disabled={disabled || pending}
      aria-busy={pending}
      className="h-11 w-full rounded-2xl text-[15px] font-semibold"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {pending ? '제출 중…' : '시작하기'}
    </Button>
  )
}

export function SurveyForm() {
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | ''>('')
  const [freq, setFreq] = useState<LlmFrequency | ''>('')

  const ageNum = Number(age)
  const ageValid = Number.isInteger(ageNum) && ageNum >= 1 && ageNum <= 120
  const complete = ageValid && gender !== '' && freq !== ''

  return (
    <form action={submitSurveyAction} className="flex flex-col gap-6">
      <div className="space-y-2">
        <label htmlFor="age" className="text-sm font-medium">
          나이
        </label>
        <Input
          id="age"
          name="age"
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          required
          value={age}
          onChange={e => setAge(e.target.value)}
          placeholder="예: 25"
          className="h-11 rounded-xl text-[15px]"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">성별</legend>
        <input type="hidden" name="gender" value={gender} />
        <div className="grid grid-cols-2 gap-2">
          {GENDER_OPTIONS.map(o => (
            <SelectablePill
              key={o.value}
              selected={gender === o.value}
              onClick={() => setGender(o.value)}
            >
              {o.label}
            </SelectablePill>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium">LLM 사용 빈도</legend>
        <input type="hidden" name="llm_frequency" value={freq} />
        <div className="grid grid-cols-1 gap-2">
          {LLM_FREQUENCY_OPTIONS.map(o => (
            <SelectablePill
              key={o.value}
              selected={freq === o.value}
              onClick={() => setFreq(o.value)}
            >
              {o.label}
            </SelectablePill>
          ))}
        </div>
      </fieldset>

      <SubmitButton disabled={!complete} />
    </form>
  )
}
