'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
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
          <Button
            variant="brand"
            onClick={() => setStarted(true)}
            className="h-11 w-full rounded-2xl text-[15px] font-semibold"
          >
            채팅 시작하기
          </Button>
        }
      />
    </ExperimentShell>
  )
}
