'use client'

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { ArrowUp, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

/** Related-condition word suggestion. Present only in 연관 trials. */
type SuggestConfig = { scenario: 'A' | 'B'; trialIndex: 1 | 2 }

/** Experiment context for pause logging. Absent in free chat (columns stay null). */
type TrialContext = {
  trialIndex?: 1 | 2
  scenario?: 'A' | 'B'
  condition?: 'baseline' | 'related'
}

/** Silence (no input) after which a 멈칫 is detected and the idle fetch fires. */
const IDLE_MS = 300

/** A finalized 멈칫, buffered until the batch flush. */
type PauseRow = {
  seq: number
  durationMs: number
  eojeol: string
  words: string[] | null
}
/** A 멈칫 in progress: open from the 300ms threshold until the next input/submit. */
type PendingPause = { firedAt: number; eojeol: string; words: string[] | null }

function lastEojeol(text: string): string {
  const parts = text.trimEnd().split(/\s+/)
  return parts.length ? parts[parts.length - 1] : ''
}

export function Composer({
  onSend,
  disabled,
  locked,
  suggest,
  chatId,
  trial,
}: {
  onSend: (text: string) => void
  disabled?: boolean
  // Experiment one-turn lock: the input is closed (no new message can be sent).
  locked?: boolean
  // When set (연관 trials), each space / idle pause queries /api/suggest and
  // shows related words above the input. Undefined for baseline trials and all
  // free chat.
  suggest?: SuggestConfig
  // The chat these pauses belong to (always present — see chats.ts createChat).
  chatId: string
  // Experiment context for pause rows; undefined in free chat.
  trial?: TrialContext
}) {
  const [value, setValue] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const ref = useRef<HTMLTextAreaElement>(null)
  // True between compositionstart/end — Hangul IME emits intermediate jamo we
  // must ignore; we only act on committed text.
  const composingRef = useRef(false)
  // Cancels the previous in-flight request when spaces come quickly.
  const abortRef = useRef<AbortController | null>(null)

  // --- 멈칫(pause) tracking (all chats; see chat-pause-events.schema.sql) ------
  // Live mirror of `value` so timer/async closures read the latest text.
  const valueRef = useRef('')
  // "No input for IDLE_MS" timer — cleared+reset on every keystroke.
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Only track after the first keystroke ("첫 채팅 입력 시작 후").
  const hasStartedTypingRef = useRef(false)
  // The pause currently being timed; its `.words` is filled if a fetch resolves
  // before it ends. A ref because the async fetch mutates the live object.
  const pendingPauseRef = useRef<PendingPause | null>(null)
  // Finalized pauses, flushed in one batch (per message / on page hide).
  const pauseBufferRef = useRef<PauseRow[]>([])
  // 1-based order of the pause within the message being composed.
  const seqRef = useRef(0)
  // Identity + result of the latest /api/suggest call, for dedup (skip a second
  // fetch of the same word) and for attaching already-available words.
  const lastFetchRef = useRef<{
    eojeol: string
    words: string[] | null
    settled: boolean
  } | null>(null)

  const trimmed = value.trim()
  const canSend = trimmed.length > 0 && !disabled

  function fireSuggest(eojeol: string, onWords?: (words: string[]) => void) {
    if (!suggest) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    lastFetchRef.current = { eojeol, words: null, settled: false }
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
      .then((d: { words?: string[] }) => {
        const words = d.words ?? []
        setSuggestions(words)
        // Only the latest fetch may mark itself settled (a newer one supersedes).
        if (lastFetchRef.current?.eojeol === eojeol) {
          lastFetchRef.current = { eojeol, words, settled: true }
        }
        onWords?.(words)
      })
      .catch(() => {}) // aborted / network — keep the previous suggestions
  }

  function armIdleTimer() {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(handleIdle, IDLE_MS)
  }

  // Fired once typing has been idle for IDLE_MS. Extracted (per plan) so Task 1
  // (idle word fetch) and Task 3 (pause tracking) share one entry point.
  function handleIdle() {
    idleTimerRef.current = null
    if (!hasStartedTypingRef.current) return
    // NOTE: we do NOT bail on composingRef here. A Hangul composition session
    // stays active through a whole word (it only ends on space / non-Hangul), so
    // bailing would block the idle fetch for every mid-word pause. After IDLE_MS
    // of silence the on-screen syllable is settled and `valueRef` is correct.
    if (pendingPauseRef.current) return // a pause is already open
    const eojeol = lastEojeol(valueRef.current)
    if (valueRef.current.trim() === '') return // nothing being composed

    const pause: PendingPause = { firedAt: Date.now(), eojeol, words: null }
    pendingPauseRef.current = pause

    // Task 1: fetch the word list on idle too (related condition only). Attach
    // the result to this pause only if it resolves before the pause ends.
    if (suggest && eojeol) {
      const lf = lastFetchRef.current
      if (lf && lf.eojeol === eojeol && lf.settled) {
        // Words for this exact word are already in hand — attach immediately.
        pause.words = lf.words
      } else if (!lf || lf.eojeol !== eojeol) {
        fireSuggest(eojeol, words => {
          if (pendingPauseRef.current === pause) pause.words = words
        })
      }
      // else: same word still in-flight → leave words null (resolves into the
      // already-displayed cloud, but not attributed to this pause).
    }
  }

  function finalizePendingPause(endAt: number) {
    const p = pendingPauseRef.current
    if (!p) return
    pendingPauseRef.current = null // a late fetch can no longer attach
    pauseBufferRef.current.push({
      seq: ++seqRef.current,
      durationMs: Math.max(0, endAt - p.firedAt),
      eojeol: p.eojeol,
      words: p.words, // snapshotted synchronously
    })
  }

  function buildPayload(pauses: PauseRow[]) {
    return {
      chatId,
      trialIndex: trial?.trialIndex,
      scenario: trial?.scenario,
      condition: trial?.condition,
      // Whether the word cloud is shown in this trial (the "단어 표시되는 상황").
      suggestActive: !!suggest,
      pauses: pauses.map(p => ({
        seq: p.seq,
        durationMs: p.durationMs,
        eojeol: p.eojeol || undefined,
        words: p.words ?? undefined,
      })),
    }
  }

  // One network write per message (or per page-hide), never per pause.
  function flushPauses(useBeacon = false) {
    const pauses = pauseBufferRef.current
    if (pauses.length === 0) return
    pauseBufferRef.current = []
    const body = JSON.stringify(buildPayload(pauses))
    if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon(
        '/api/pause-events',
        new Blob([body], { type: 'application/json' }),
      )
    } else {
      fetch('/api/pause-events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  }

  function resetTracking() {
    hasStartedTypingRef.current = false
    pendingPauseRef.current = null
    seqRef.current = 0
    lastFetchRef.current = null
    // pauseBufferRef was emptied by flushPauses on submit.
  }

  // Safety net: flush buffered pauses if the tab is hidden/closed before submit,
  // and tidy up timers/requests on unmount. The empty-buffer guard makes the
  // pagehide + visibilitychange pair (and the unmount flush) idempotent.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState !== 'hidden') return
      finalizePendingPause(Date.now())
      flushPauses(true)
    }
    function onPageHide() {
      finalizePendingPause(Date.now())
      flushPauses(true)
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', onPageHide)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      abortRef.current?.abort()
      finalizePendingPause(Date.now())
      flushPauses(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatId])

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value
    const now = Date.now()
    // Resume detected: close any open 멈칫 before recording fresh activity.
    finalizePendingPause(now)
    setValue(next)
    valueRef.current = next

    // Pause tracking runs in ALL chats (chatId is always present).
    if (next.length > 0) hasStartedTypingRef.current = true
    if (hasStartedTypingRef.current) armIdleTimer()

    if (!suggest || composingRef.current) return
    if (next.trim() === '') {
      setSuggestions([])
      return
    }
    // A space was just committed (new trailing whitespace) → the token right
    // before it is the "previous word". Embeds + searches scenario vocabulary.
    if (next.length > value.length && /\s$/.test(next) && !/\s$/.test(value)) {
      const eojeol = lastEojeol(next.slice(0, -1))
      // Dedup against the latest query so space + idle don't double-fetch.
      if (eojeol && lastFetchRef.current?.eojeol !== eojeol) fireSuggest(eojeol)
    }
  }

  function submit(e?: FormEvent) {
    e?.preventDefault()
    if (!canSend) return
    // A pause open at submit (read suggestions, then sent) ends here.
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
    finalizePendingPause(Date.now())
    flushPauses()
    onSend(trimmed)
    setValue('')
    valueRef.current = ''
    setSuggestions([])
    abortRef.current?.abort()
    resetTracking()
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
            // A pause may begin right after a committed syllable — re-arm so it
            // is still detected even if no trailing onChange fires.
            if (hasStartedTypingRef.current) armIdleTimer()
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
