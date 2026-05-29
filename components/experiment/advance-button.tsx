'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { advanceStepAction } from '@/app/actions/experiment'
import type { Step } from '@/lib/experiment/config'

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="brand"
      disabled={pending}
      aria-busy={pending}
      className="h-11 w-full rounded-2xl text-[15px] font-semibold"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  )
}

/**
 * Forward "다음" button. Submits `advanceStepAction(step)` — the server verifies
 * the participant is still on `step` before moving on (idempotent on re-click).
 */
export function AdvanceButton({
  step,
  label = '다음',
  className,
}: {
  step: Step
  label?: string
  className?: string
}) {
  return (
    <form action={advanceStepAction.bind(null, step)} className={cn(className)}>
      <Submit label={label} />
    </form>
  )
}
