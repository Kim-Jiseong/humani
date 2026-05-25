'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ReasoningBlock({
  text,
  isStreaming,
  showCursor,
}: {
  text: string
  isStreaming: boolean
  showCursor?: boolean
}) {
  // Default closed; user can manually expand to inspect thinking.
  const [open, setOpen] = useState(false)

  return (
    <div className="w-full max-w-[85%] overflow-hidden rounded-2xl rounded-bl-sm border border-border/60 bg-muted/40">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/70"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <span
            className={cn(
              'size-1.5 rounded-full',
              isStreaming
                ? 'animate-pulse bg-emerald-500'
                : 'bg-muted-foreground/50',
            )}
          />
          <span>{isStreaming ? '생각 중…' : '생각 과정'}</span>
        </span>
        <ChevronDown
          className={cn('size-3.5 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div className="whitespace-pre-wrap wrap-break-word border-t border-border/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {text || (isStreaming ? '...' : '')}
          {showCursor && (
            <span
              className="blink-cursor ml-0.5 inline-block h-[0.95em] w-[2px] bg-current align-middle"
              aria-hidden
            />
          )}
        </div>
      )}
    </div>
  )
}
