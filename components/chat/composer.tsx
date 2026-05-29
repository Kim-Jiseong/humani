'use client'

import { useRef, useState, type FormEvent } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

export function Composer({
  onSend,
  disabled,
  locked,
}: {
  onSend: (text: string) => void
  disabled?: boolean
  // Experiment one-turn lock: the input is closed (no new message can be sent).
  locked?: boolean
}) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const trimmed = value.trim()
  const canSend = trimmed.length > 0 && !disabled

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!canSend) return
    onSend(trimmed)
    setValue('')
    ref.current?.focus()
  }

  if (locked) {
    return (
      <div className="glass flex min-h-12 items-center justify-center rounded-2xl px-4 py-3 text-center text-sm text-muted-foreground">
        이 시나리오에서는 한 번만 입력할 수 있어요
      </div>
    )
  }

  // Enter inserts a newline (textarea default). Submission is button-only —
  // prevents accidental sends from the mobile virtual keyboard's return key
  // and from IME composition commits.

  return (
    <form onSubmit={submit}>
      {/* Shell holds the textarea + send button; conic-border rotates the
          iridescent ring only when focus is inside (CSS :focus-within). */}
      <div
        className={cn(
          'conic-border glass relative flex items-end rounded-2xl shadow-[0_10px_30px_-12px_oklch(0_0_0/30%)]',
          'transition-shadow duration-300 focus-within:shadow-glow-brand',
        )}
      >
        <Textarea
          ref={ref}
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="메시지를 입력하세요…"
          rows={1}
          disabled={disabled}
          className={cn(
            'min-h-12 max-h-40 resize-none border-transparent bg-transparent px-4 py-3 pr-14 text-[15px] leading-6 shadow-none placeholder:text-muted-foreground/80',
            'focus-visible:border-transparent focus-visible:ring-0 focus-visible:outline-none',
            'dark:bg-transparent disabled:bg-transparent dark:disabled:bg-transparent',
          )}
        />
        {/* size-9 (36px) gives a tap target that reads as primary action;
            bottom-1.5 happens to vertically center on single-line (textarea
            min-h-12 → 6px gap above & below), and stays bottom-aligned when
            content wraps to multiple lines. */}
        <button
          type="submit"
          disabled={!canSend}
          aria-label="전송"
          className={cn(
            'absolute right-1.5 bottom-1.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-[transform,box-shadow,background-color,opacity] duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
            canSend
              ? 'bg-brand-gradient text-white shadow-glow-brand hover:scale-105 hover:shadow-glow-brand-strong active:scale-95'
              : 'cursor-not-allowed bg-muted text-muted-foreground/60',
          )}
        >
          {disabled ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ArrowUp className="size-5" strokeWidth={2.5} />
          )}
        </button>
      </div>
    </form>
  )
}
