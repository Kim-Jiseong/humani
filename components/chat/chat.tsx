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
import { MessageList } from './message-list'
import { Composer } from './composer'
import { ChatSidebar } from './chat-sidebar'
import { NewChatSubmit } from './new-chat-submit'

export function Chat({
  id,
  initialMessages,
  chats,
  user,
}: {
  id: string
  initialMessages: UIMessage[]
  chats: ChatRow[]
  user: ChatUser
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

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-md flex-col">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-1 border-b border-glass-border bg-glass px-3 backdrop-blur-xl backdrop-saturate-150">
        <ChatSidebar chats={chats} currentChatId={id} user={user} />
        <h1 className="text-brand-gradient pointer-events-none absolute left-1/2 -translate-x-1/2 text-base font-semibold tracking-tight">
          Humani
        </h1>
        <div className="ml-auto flex items-center gap-0.5">
          <form action={createNewChatAction}>
            <NewChatSubmit />
          </form>
          <ThemeToggle />
        </div>
      </header>

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
        <Composer onSend={text => sendMessage({ text })} disabled={busy} />
      </footer>
    </div>
  )
}
