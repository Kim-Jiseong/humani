'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ExperimentShell } from '@/components/experiment/experiment-shell'
import {
  OneShotNotice,
  ScenarioView,
} from '@/components/experiment/scenario-view'
import type { ScenarioContent, TrialIndex } from '@/lib/experiment/config'

/**
 * Gate around the experiment chat. Before composing, always show the scenario
 * recap + "채팅 시작하기" — so a fresh entry OR a re-entry (refresh / return)
 * never drops the participant onto a context-less empty chat. A trial whose turn
 * is already completed (`startInChat`) skips the recap and shows the result.
 *
 * `children` is the <Chat> element; it only mounts once started, so the stream
 * isn't opened while the recap is showing.
 */
export function TrialChat({
  trialIndex,
  scenario,
  startInChat,
  children,
}: {
  trialIndex: TrialIndex
  scenario: ScenarioContent
  startInChat: boolean
  children: React.ReactNode
}) {
  const [started, setStarted] = useState(startInChat)

  if (started) return <>{children}</>

  return (
    <ExperimentShell>
      <ScenarioView
        trialIndex={trialIndex}
        scenario={scenario}
        notice={<OneShotNotice />}
        footer={
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="brand"
                  className="h-11 w-full rounded-2xl text-[15px] font-semibold"
                />
              }
            >
              채팅 시작하기
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>채팅을 시작할까요?</AlertDialogTitle>
                <AlertDialogDescription>
                  채팅은 딱 1번만 입력할 수 있어요. 시나리오를 충분히
                  숙지하셨나요?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>다시 볼게요</AlertDialogCancel>
                <AlertDialogAction onClick={() => setStarted(true)}>
                  네, 시작할게요
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />
    </ExperimentShell>
  )
}
