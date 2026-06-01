'use client'

import { useChat } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from 'ai'
import { useMemo } from 'react'
import type { ChatRow, ChatUser } from '@/lib/db/chats'
import { ThemeToggle } from '@/components/theme-toggle'
import { createNewChatAction } from '@/app/actions/chats'
import type { ScenarioKey, Step } from '@/lib/experiment/config'
import { ConditionBadge } from '@/components/experiment/condition-badge'
import { ChatAdvance } from '@/components/experiment/chat-advance'
import { MessageList } from './message-list'
import { Composer } from './composer'
import { ChatSidebar } from './chat-sidebar'
import { NewChatSubmit } from './new-chat-submit'

/**
 * Experiment mode. When present, the chat becomes a single-turn, sidebar-less
 * surface: the participant sends exactly one message, sees the result, then
 * advances. `onAdvanceAction` is the server action bound to this chat step.
 */
export type ExperimentMode = {
  trialIndex: 1 | 2
  condition: 'baseline' | 'related'
  // Scenario of this trial; scopes the related-condition word suggestion search.
  scenario: ScenarioKey
  // The 'trial{n}_chat' step this chat advances from. Passed as a string (not a
  // bound action) so only serializable data crosses the RSC→client boundary.
  chatStep: Step
  lockedInitially: boolean
}

export function Chat({
  id,
  initialMessages,
  chats,
  user,
  experiment,
}: {
  id: string
  initialMessages: UIMessage[]
  chats: ChatRow[]
  user: ChatUser
  experiment?: ExperimentMode
}) {
  // Stable transport reference — recreating it per render would reset the SSE stream mid-flight.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages, id }) => ({
          body: { messages, id },
        }),
      }),
    [],
  )

  const { messages, sendMessage, status, error, regenerate } = useChat({
    id,
    messages: initialMessages,
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onError: err => {
      console.error('[useChat] stream error:', err)
    },
  })

  const busy = status === 'streaming' || status === 'submitted'

  // --- Experiment one-turn lifecycle -------------------------------------
  const userTurns = experiment
    ? messages.filter(m => m.role === 'user').length
    : 0
  const lastMsg = messages.length ? messages[messages.length - 1] : undefined
  const lastAssistantComplete =
    !!lastMsg &&
    lastMsg.role === 'assistant' &&
    lastMsg.parts.some(
      p => p.type === 'text' || p.type.startsWith('tool-'),
    )
  const turnComplete =
    userTurns >= 1 && lastAssistantComplete && status === 'ready'
  // Result is in → offer "다음". Trust the DB lock on reload too.
  const showAdvance =
    !!experiment && (turnComplete || experiment.lockedInitially)
  // Turn sent but not (yet) advanceable and not actively streaming → closed.
  const composerLocked =
    !!experiment && !showAdvance && userTurns >= 1 && !busy

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b border-glass-border bg-glass px-3 backdrop-blur-xl backdrop-saturate-150">
        {experiment ? (
          <span className="size-7" aria-hidden />
        ) : (
          <ChatSidebar chats={chats} currentChatId={id} user={user} />
        )}
        <h1 className="text-brand-gradient pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold tracking-tight">
          Humani
        </h1>
        <div className="ml-auto flex items-center gap-0.5">
          {!experiment && (
            <form action={createNewChatAction}>
              <NewChatSubmit />
            </form>
          )}
          <ThemeToggle />
        </div>
      </header>

      {experiment?.condition === 'related' && (
        <div className="flex shrink-0 justify-center px-3 pt-2">
          <ConditionBadge />
        </div>
      )}

      <main className="relative flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          status={status}
          error={error}
          onRegenerate={() => regenerate()}
        />
        {/* Soft mask so messages dissolve into the composer instead of hitting
            a hard edge. Sits above the scroll content, below the composer. */}
        <div
          aria-hidden
          className="footer-fade pointer-events-none absolute inset-x-0 bottom-0 z-10 h-20"
        />
      </main>

      <footer className="relative shrink-0 px-3 pt-1 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {experiment && showAdvance ? (
          <ChatAdvance step={experiment.chatStep} />
        ) : (
          <Composer
            onSend={text => sendMessage({ text })}
            disabled={busy}
            locked={composerLocked}
            suggest={
              experiment?.condition === 'related'
                ? {
                    scenario: experiment.scenario,
                    trialIndex: experiment.trialIndex,
                  }
                : undefined
            }
          />
        )}
      </footer>
    </div>
  )
}
