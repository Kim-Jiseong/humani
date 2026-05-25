'use client'

import { useChat } from '@ai-sdk/react'
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from 'ai'
import { useMemo } from 'react'
import type { ChatRow, ChatUser } from '@/lib/db/chats'
import { MessageList } from './message-list'
import { Composer } from './composer'
import { ChatSidebar } from './chat-sidebar'

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
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b bg-background/95 px-3 py-2 backdrop-blur supports-backdrop-filter:bg-background/80">
        <h1 className="flex-1 truncate text-base font-semibold tracking-tight">
          Humani
        </h1>
        <ChatSidebar chats={chats} currentChatId={id} user={user} />
      </header>

      <main className="flex-1 overflow-hidden">
        <MessageList
          messages={messages}
          status={status}
          error={error}
          onRegenerate={() => regenerate()}
        />
      </main>

      <footer className="shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)]">
        <Composer onSend={text => sendMessage({ text })} disabled={busy} />
      </footer>
    </div>
  )
}
