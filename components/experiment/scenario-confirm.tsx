'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { advanceStepAction } from '@/app/actions/experiment'
import type { Step } from '@/lib/experiment/config'

function ConfirmSubmit() {
  const { pending } = useFormStatus()
  return (
    <Button
      type="submit"
      variant="brand"
      disabled={pending}
      aria-busy={pending}
      className="h-10 w-full rounded-xl font-semibold"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      네, 시작할게요
    </Button>
  )
}

/**
 * "다음" on a scenario screen. Opens a confirmation dialog first, because once
 * the participant advances the scenario can no longer be viewed.
 */
export function ScenarioConfirm({ step }: { step: Step }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="brand"
            className="h-11 w-full rounded-2xl text-[15px] font-semibold"
          />
        }
      >
        다음
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>다음으로 넘어갈까요?</DialogTitle>
          <DialogDescription>
            다음 화면으로 넘어가면 시나리오를 다시 볼 수 없습니다. 충분히
            숙지하셨나요?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button variant="outline" className="h-10 w-full rounded-xl sm:w-auto" />
            }
          >
            취소
          </DialogClose>
          <form
            action={advanceStepAction.bind(null, step)}
            className="w-full sm:w-auto"
          >
            <ConfirmSubmit />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
