'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { advanceStepAction } from '@/app/actions/experiment'
import type { Step } from '@/lib/experiment/config'

function Submit() {
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
      다음
    </Button>
  )
}

/**
 * "다음" CTA shown in the experiment chat footer once the single turn completes.
 * Binds `advanceStepAction` to the current chat step on the client (same pattern
 * as AdvanceButton) — the server re-verifies the step before moving on.
 */
export function ChatAdvance({ step }: { step: Step }) {
  return (
    <form action={advanceStepAction.bind(null, step)}>
      <Submit />
    </form>
  )
}
