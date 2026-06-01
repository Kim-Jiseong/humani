'use client'

import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

/** Related-condition word suggestion. Present only in 연관 trials. */
type SuggestConfig = { scenario: 'A' | 'B'; trialIndex: 1 | 2 }

function lastEojeol(text: string): string {
  const parts = text.trimEnd().split(/\s+/)
  return parts.length ? parts[parts.length - 1] : ''
}

export function Composer({
  onSend,
  disabled,
  locked,
  suggest,
}: {
  onSend: (text: string) => void
  disabled?: boolean
  // Experiment one-turn lock: the input is closed (no new message can be sent).
  locked?: boolean
  // When set (연관 trials), each space queries /api/suggest and shows related
  // words above the input. Undefined for baseline trials and all free chat.
  suggest?: SuggestConfig
}) {
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const ref = useRef<HTMLTextAreaElement>(null)
  // True between compositionstart/end — Hangul IME emits intermediate jamo we
  // must ignore; we only act on committed text.
  const composingRef = useRef(false)
  // Cancels the previous in-flight request when spaces come quickly.
  const abortRef = useRef<AbortController | null>(null)

  const trimmed = value.trim()
  const canSend = trimmed.length > 0 && !disabled

  function fireSuggest(eojeol: string) {
    if (!suggest) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    fetch('/api/suggest', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        scenario: suggest.scenario,
        eojeol,
        trialIndex: suggest.trialIndex,
      }),
      signal: ctrl.signal,
    })
      .then(r => (r.ok ? r.json() : { words: [] }))
      .then((d: { words?: string[] }) => setSuggestions(d.words ?? []))
      .catch(() => {}) // aborted / network — keep the previous suggestions
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value
    setValue(next)
    if (!suggest || composingRef.current) return
    if (next.trim() === '') {
      setSuggestions([])
      return
    }
    // A space was just committed (new trailing whitespace) → the token right
    // before it is the "previous word". Embeds + searches scenario vocabulary.
    if (next.length > value.length && /\s$/.test(next) && !/\s$/.test(value)) {
      const eojeol = lastEojeol(next.slice(0, -1))
      if (eojeol) fireSuggest(eojeol)
    }
  }

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!canSend) return
    onSend(trimmed)
    setValue('')
    setSuggestions([])
    abortRef.current?.abort()
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
      {/* Related-condition suggestions: passive, display-only (no click insert).
          Up to 6 related words in 2 rows × 3, replaced on each space. */}
      {suggest && suggestions.length > 0 && (
        <div className="mb-2 grid grid-cols-3 gap-2" aria-live="polite">
          {suggestions.map((w, i) => (
            <span
              key={`${w}-${i}`}
              className="glass truncate rounded-full px-2.5 py-1.5 text-center text-[13px] font-medium text-foreground"
            >
              {w}
            </span>
          ))}
        </div>
      )}

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
          onChange={handleChange}
          onCompositionStart={() => {
            composingRef.current = true
          }}
          onCompositionEnd={() => {
            composingRef.current = false
          }}
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
