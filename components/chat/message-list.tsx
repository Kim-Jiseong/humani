'use client'

import { useEffect, useMemo, useRef } from 'react'
import type { UIMessage } from 'ai'
import { Streamdown } from 'streamdown'
import { mermaid } from '@streamdown/mermaid'
import { math } from '@streamdown/math'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ToolRenderHtml } from './tool-render-html'
import { ReasoningBlock } from './reasoning-block'

type AnyPart = UIMessage['parts'][number] & {
  text?: string
  state?: string
}

export function MessageList({
  messages,
  status,
  error,
  onRegenerate,
}: {
  messages: UIMessage[]
  status: string
  error?: Error
  onRegenerate?: () => void
}) {
  const endRef = useRef<HTMLDivElement>(null)
  const initialScrollDone = useRef(false)

  useEffect(() => {
    if (!endRef.current) return
    // Instant jump on initial mount (load past chat without animation), smooth thereafter.
    endRef.current.scrollIntoView({
      behavior: initialScrollDone.current ? 'smooth' : 'instant',
      block: 'end',
    })
    initialScrollDone.current = true
  }, [messages, status, error])

  // Plugin instances are stable refs; memoize to avoid re-rendering Streamdown internals.
  const plugins = useMemo(() => ({ mermaid, math }), [])

  const lastIdx = messages.length - 1
  const lastMessage = messages[lastIdx]
  const isStreamingLast =
    status === 'streaming' && lastMessage?.role === 'assistant'

  // Show loading dots from the moment the request is sent until the first
  // visible text part arrives. Without this, the user sees nothing while the
  // model is "thinking" (reasoning streams into a collapsed accordion).
  const lastAssistantHasText =
    lastMessage?.role === 'assistant' &&
    lastMessage.parts.some(p => p.type === 'text')
  const showWaitingDots =
    status === 'submitted' ||
    (status === 'streaming' && !lastAssistantHasText)

  // Stale / incomplete trailing state — show retry CTA when:
  //   - last message is a user (no assistant response yet), OR
  //   - last message is an assistant but has no user-visible content
  //     (e.g., aborted stream that only emitted reasoning / step-start)
  const lastHasVisibleAnswer =
    lastMessage?.parts.some(
      p => p.type === 'text' || p.type.startsWith('tool-'),
    ) ?? false
  const staleUserTrailing =
    !error &&
    status === 'ready' &&
    lastMessage !== undefined &&
    (lastMessage.role === 'user' ||
      (lastMessage.role === 'assistant' && !lastHasVisibleAnswer))

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-3 px-4 py-4">
        {messages.length === 0 && !showWaitingDots && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            메시지를 입력해 대화를 시작하세요.
          </div>
        )}

        {messages.map((message, mIdx) => {
          const isLastMessage = mIdx === lastIdx
          const lastStreamableIdx = message.parts.reduce(
            (acc, p, i) =>
              p.type === 'text' || p.type === 'reasoning' ? i : acc,
            -1,
          )

          return (
            <div
              key={message.id}
              className={cn(
                'flex w-full flex-col gap-2',
                message.role === 'user' ? 'items-end' : 'items-start',
              )}
            >
              {message.parts.map((part, idx) => {
                const key = `${message.id}-${idx}`
                const p = part as AnyPart
                const showCursor =
                  isLastMessage &&
                  isStreamingLast &&
                  idx === lastStreamableIdx

                if (part.type === 'text') {
                  if (message.role === 'user') {
                    return (
                      <div
                        key={key}
                        className="max-w-[85%] min-w-0 whitespace-pre-wrap wrap-break-word rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm leading-relaxed text-primary-foreground"
                      >
                        {p.text}
                      </div>
                    )
                  }
                  return (
                    <div
                      key={key}
                      className="w-full max-w-[85%] min-w-0 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm leading-relaxed text-foreground"
                    >
                      <Streamdown
                        parseIncompleteMarkdown
                        plugins={plugins}
                      >
                        {p.text ?? ''}
                      </Streamdown>
                      {showCursor && (
                        <span
                          className="blink-cursor ml-0.5 inline-block h-[0.95em] w-[3px] bg-current align-middle"
                          aria-hidden
                        />
                      )}
                    </div>
                  )
                }

                if (part.type === 'reasoning') {
                  return (
                    <ReasoningBlock
                      key={key}
                      text={p.text ?? ''}
                      isStreaming={showCursor}
                      showCursor={showCursor}
                    />
                  )
                }

                if (part.type === 'tool-renderHtml') {
                  return <ToolRenderHtml key={key} part={part as never} />
                }

                if (part.type === 'step-start') {
                  return null
                }

                return null
              })}
            </div>
          )
        })}

        {showWaitingDots && (
          <div className="flex items-start">
            <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current" />
              </span>
            </div>
          </div>
        )}

        {(error || staleUserTrailing) && onRegenerate && (
          <div className="flex items-start">
            <div
              className={cn(
                'flex max-w-[85%] flex-col gap-2 rounded-2xl rounded-bl-sm px-3 py-2 text-sm',
                error
                  ? 'border border-destructive/30 bg-destructive/10 text-destructive'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              <span>
                {error
                  ? `응답 생성 중 오류가 발생했습니다${error.message ? ` (${error.message})` : ''}.`
                  : '응답이 도착하지 않았습니다. 다시 시도해 주세요.'}
              </span>
              <Button
                type="button"
                onClick={onRegenerate}
                variant={error ? 'destructive' : 'secondary'}
                size="sm"
                className="self-start"
              >
                다시 시도
              </Button>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>
    </ScrollArea>
  )
}
