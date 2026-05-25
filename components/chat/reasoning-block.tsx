'use client'

import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
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
    <div className="w-full max-w-[95%] overflow-hidden rounded-2xl border border-glass-border bg-glass backdrop-blur-md">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/3 dark:hover:bg-white/5"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          {isStreaming ? (
            <span
              aria-hidden
              className="size-2 rounded-full bg-brand-2 shadow-glow-brand"
              style={{ animation: 'brand-pulse 1.2s ease-in-out infinite' }}
            />
          ) : (
            <Sparkles className="size-3.5 text-brand-2" />
          )}
          <span
            className={cn(
              'font-medium',
              isStreaming ? 'text-brand-gradient' : 'text-muted-foreground',
            )}
          >
            {isStreaming ? '생각 중…' : '생각 과정'}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="wrap-break-word border-t border-glass-border px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {text || (isStreaming ? '...' : '')}
              {showCursor && (
                <span
                  className="blink-cursor ml-0.5 inline-block h-[0.95em] w-[2px] bg-current align-middle"
                  aria-hidden
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
