// Pure aggregation for the experiment dashboard. No DB / IO — takes the raw
// datasets from lib/db/dashboard.ts and produces serializable summaries that a
// server component can hand to client (recharts) components.

import type {
  Condition,
  Gender,
  GroupType,
  LlmFrequency,
  ScenarioKey,
  TrialIndex,
} from '@/lib/experiment/config'
import {
  GENDER_OPTIONS,
  LLM_FREQUENCY_OPTIONS,
} from '@/lib/experiment/config'
import {
  TLX_ITEMS,
  WORD_INFLUENCE_OPTIONS,
  WORD_RECOGNITION_OPTIONS,
  type TlxKey,
  type TrialSurveyAnswers,
  type WordInfluence,
  type WordRecognition,
} from '@/lib/experiment/survey'
import type {
  DashboardData,
  DashParticipant,
  DashPauseEvent,
  DashSuggestion,
  DashTrial,
} from '@/lib/db/dashboard'

// ---------------------------------------------------------------------------
// Numeric helpers
// ---------------------------------------------------------------------------

export function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}

export function mean(xs: number[]): number {
  return xs.length ? sum(xs) / xs.length : 0
}

export function median(xs: number[]): number {
  if (!xs.length) return 0
  const s = [...xs].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function minOf(xs: number[]): number {
  return xs.length ? Math.min(...xs) : 0
}

function maxOf(xs: number[]): number {
  return xs.length ? Math.max(...xs) : 0
}

// ---------------------------------------------------------------------------
// Pause statistics
// ---------------------------------------------------------------------------

export type PauseStats = {
  count: number // number of pause events
  avgMs: number
  medianMs: number
  sumMs: number
  minMs: number
  maxMs: number
}

export function pauseStats(durations: number[]): PauseStats {
  return {
    count: durations.length,
    avgMs: mean(durations),
    medianMs: median(durations),
    sumMs: sum(durations),
    minMs: minOf(durations),
    maxMs: maxOf(durations),
  }
}

/** mean / median / sum of a per-user metric (one value per user). */
export type Dist = { mean: number; median: number; sum: number }

function dist(values: number[]): Dist {
  return { mean: mean(values), median: median(values), sum: sum(values) }
}

/** Group durations by user → returns each user's list of pause durations. */
function durationsByUser(events: DashPauseEvent[]): number[][] {
  const map = new Map<string, number[]>()
  for (const e of events) {
    const list = map.get(e.userId) ?? []
    list.push(e.durationMs)
    map.set(e.userId, list)
  }
  return [...map.values()]
}

// ---------------------------------------------------------------------------
// Grouped pause aggregate (condition / scenario / trial-order / overall)
// ---------------------------------------------------------------------------

export type GroupAgg = {
  key: string
  label: string
  nUsers: number
  events: PauseStats // pooled over every event in the group
  perUserCount: Dist // distribution of each user's total pause COUNT
  perUserSumMs: Dist // distribution of each user's total pause DURATION
}

function groupAgg(key: string, label: string, events: DashPauseEvent[]): GroupAgg {
  const perUser = durationsByUser(events)
  return {
    key,
    label,
    nUsers: perUser.length,
    events: pauseStats(events.map(e => e.durationMs)),
    perUserCount: dist(perUser.map(d => d.length)),
    perUserSumMs: dist(perUser.map(sum)),
  }
}

// ---------------------------------------------------------------------------
// Per-user × trial detail rows
// ---------------------------------------------------------------------------

export type UserTrialRow = {
  userId: string
  userShort: string // first 8 chars of the uuid (anonymized label)
  seq: number
  groupType: GroupType
  age: number
  gender: Gender
  llmFrequency: LlmFrequency
  completed: boolean
  trialIndex: TrialIndex
  scenario: ScenarioKey
  condition: Condition
  suggestActive: boolean
  submitted: boolean
  pause: PauseStats
  survey: Partial<TrialSurveyAnswers> | null
}

export function buildUserTrialRows(data: DashboardData): UserTrialRow[] {
  const pByUser = new Map(data.participants.map(p => [p.userId, p]))

  const rows: UserTrialRow[] = []
  for (const t of data.trials) {
    const p = pByUser.get(t.userId)
    const events = data.pauseEvents.filter(
      e => e.userId === t.userId && e.trialIndex === t.trialIndex,
    )
    const survey =
      data.surveys.find(
        s => s.userId === t.userId && s.trialIndex === t.trialIndex,
      )?.answers ?? null

    rows.push({
      userId: t.userId,
      userShort: t.userId.slice(0, 8),
      seq: p?.seq ?? 0,
      groupType: (p?.groupType ?? 1) as GroupType,
      age: p?.age ?? 0,
      gender: (p?.gender ?? 'male') as Gender,
      llmFrequency: (p?.llmFrequency ?? 'low') as LlmFrequency,
      completed: p?.completedAt != null,
      trialIndex: t.trialIndex,
      scenario: t.scenario,
      condition: t.condition,
      suggestActive: t.condition === 'related',
      submitted: t.submittedAt != null,
      pause: pauseStats(events.map(e => e.durationMs)),
      survey,
    })
  }

  // seq asc, then trial 1 before 2
  rows.sort((a, b) => a.seq - b.seq || a.trialIndex - b.trialIndex)
  return rows
}

// ---------------------------------------------------------------------------
// Demographics
// ---------------------------------------------------------------------------

export type CountItem = { key: string; label: string; count: number }

const AGE_BUCKETS: { label: string; test: (n: number) => boolean }[] = [
  { label: '~19', test: n => n <= 19 },
  { label: '20–29', test: n => n >= 20 && n <= 29 },
  { label: '30–39', test: n => n >= 30 && n <= 39 },
  { label: '40+', test: n => n >= 40 },
]

export type Demographics = {
  total: number
  completed: number
  gender: CountItem[]
  llmFrequency: CountItem[]
  age: CountItem[]
  group: CountItem[]
}

function demographics(data: DashboardData): Demographics {
  const ps = data.participants
  const countBy = <T extends string>(
    options: { value: T; label: string }[],
    pick: (p: (typeof ps)[number]) => T,
  ): CountItem[] =>
    options.map(o => ({
      key: o.value,
      label: o.label,
      count: ps.filter(p => pick(p) === o.value).length,
    }))

  return {
    total: ps.length,
    completed: ps.filter(p => p.completedAt != null).length,
    gender: countBy(GENDER_OPTIONS, p => p.gender),
    llmFrequency: countBy(LLM_FREQUENCY_OPTIONS, p => p.llmFrequency),
    age: AGE_BUCKETS.map(b => ({
      key: b.label,
      label: b.label,
      count: ps.filter(p => b.test(p.age)).length,
    })),
    group: ([1, 2, 3, 4] as GroupType[]).map(g => ({
      key: String(g),
      label: `그룹 ${g}`,
      count: ps.filter(p => p.groupType === g).length,
    })),
  }
}

// ---------------------------------------------------------------------------
// Survey (NASA-TLX + related items)
// ---------------------------------------------------------------------------

export type TlxByCondition = {
  key: TlxKey
  title: string
  baseline: number // mean
  related: number // mean
}

export type SurveySummary = {
  tlx: TlxByCondition[]
  wordRecognition: CountItem[]
  wordInfluence: CountItem[]
  nResponses: number
}

function surveySummary(data: DashboardData): SurveySummary {
  // condition per (userId, trialIndex) from trials
  const condOf = new Map<string, Condition>()
  for (const t of data.trials) condOf.set(`${t.userId}:${t.trialIndex}`, t.condition)

  const byCond = (cond: Condition) =>
    data.surveys.filter(
      s => condOf.get(`${s.userId}:${s.trialIndex}`) === cond,
    )

  const baseline = byCond('baseline')
  const related = byCond('related')

  const tlxMean = (rows: typeof data.surveys, key: TlxKey) =>
    mean(
      rows
        .map(r => r.answers[key])
        .filter((v): v is number => typeof v === 'number'),
    )

  const recCount = (v: WordRecognition) =>
    related.filter(r => r.answers.word_recognition === v).length
  const infCount = (v: WordInfluence) =>
    related.filter(r => r.answers.word_influence === v).length

  return {
    tlx: TLX_ITEMS.map(item => ({
      key: item.key,
      title: item.title,
      baseline: tlxMean(baseline, item.key),
      related: tlxMean(related, item.key),
    })),
    wordRecognition: WORD_RECOGNITION_OPTIONS.map(o => ({
      key: o.value,
      label: o.label,
      count: recCount(o.value),
    })),
    wordInfluence: WORD_INFLUENCE_OPTIONS.map(o => ({
      key: o.value,
      label: o.label,
      count: infCount(o.value),
    })),
    nResponses: data.surveys.length,
  }
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

export type SuggestionSummary = {
  total: number
  perUser: { userShort: string; seq: number; count: number }[]
  topWords: CountItem[]
}

function suggestionSummary(data: DashboardData): SuggestionSummary {
  const seqOf = new Map(data.participants.map(p => [p.userId, p.seq]))

  const userCounts = new Map<string, number>()
  const wordCounts = new Map<string, number>()
  for (const s of data.suggestions) {
    userCounts.set(s.userId, (userCounts.get(s.userId) ?? 0) + 1)
    wordCounts.set(s.queryWord, (wordCounts.get(s.queryWord) ?? 0) + 1)
  }

  return {
    total: data.suggestions.length,
    perUser: [...userCounts.entries()]
      .map(([userId, count]) => ({
        userShort: userId.slice(0, 8),
        seq: seqOf.get(userId) ?? 0,
        count,
      }))
      .sort((a, b) => a.seq - b.seq),
    topWords: [...wordCounts.entries()]
      .map(([word, count]) => ({ key: word, label: word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15),
  }
}

// ---------------------------------------------------------------------------
// Top-level dashboard summary
// ---------------------------------------------------------------------------

export type Overview = {
  participants: number
  completed: number
  trialsSubmitted: number
  pauseEvents: number
  // event-level over ALL events
  allEvents: PauseStats
  // per-user totals across ALL users with pause data
  perUserCount: Dist
  perUserSumMs: Dist
  nUsersWithPauses: number
}

export type DashboardSummary = {
  overview: Overview
  byCondition: GroupAgg[]
  byScenario: GroupAgg[]
  byTrialIndex: GroupAgg[]
  rows: UserTrialRow[]
  demographics: Demographics
  survey: SurveySummary
  suggestions: SuggestionSummary
}

export function summarize(data: DashboardData): DashboardSummary {
  const allPauses = data.pauseEvents
  const perUser = durationsByUser(allPauses)

  const overview: Overview = {
    participants: data.participants.length,
    completed: data.participants.filter(p => p.completedAt != null).length,
    trialsSubmitted: data.trials.filter(t => t.submittedAt != null).length,
    pauseEvents: allPauses.length,
    allEvents: pauseStats(allPauses.map(e => e.durationMs)),
    perUserCount: dist(perUser.map(d => d.length)),
    perUserSumMs: dist(perUser.map(sum)),
    nUsersWithPauses: perUser.length,
  }

  const byCondition: GroupAgg[] = (['baseline', 'related'] as Condition[]).map(
    c =>
      groupAgg(
        c,
        c === 'baseline' ? 'baseline (워드클라우드 X)' : 'related (워드클라우드 O)',
        allPauses.filter(e => e.condition === c),
      ),
  )

  const byScenario: GroupAgg[] = (['A', 'B'] as ScenarioKey[]).map(s =>
    groupAgg(s, `시나리오 ${s}`, allPauses.filter(e => e.scenario === s)),
  )

  const byTrialIndex: GroupAgg[] = ([1, 2] as TrialIndex[]).map(i =>
    groupAgg(String(i), `Trial ${i}`, allPauses.filter(e => e.trialIndex === i)),
  )

  return {
    overview,
    byCondition,
    byScenario,
    byTrialIndex,
    rows: buildUserTrialRows(data),
    demographics: demographics(data),
    survey: surveySummary(data),
    suggestions: suggestionSummary(data),
  }
}

// ---------------------------------------------------------------------------
// Filtering (period / type / result) — runs client-side over the raw dataset
// ---------------------------------------------------------------------------

export type FilterValues = {
  /** Participation period (by participant created_at). */
  period: 'all' | '7d' | '30d' | 'custom'
  from: string // yyyy-mm-dd (custom only)
  to: string // yyyy-mm-dd (custom only)
  condition: 'all' | Condition
  scenario: 'all' | ScenarioKey
  status: 'all' | 'completed' | 'in_progress'
}

export const DEFAULT_FILTERS: FilterValues = {
  period: 'all',
  from: '',
  to: '',
  condition: 'all',
  scenario: 'all',
  status: 'all',
}

export type ResolvedFilter = {
  fromMs: number | null
  toMs: number | null
  condition: 'all' | Condition
  scenario: 'all' | ScenarioKey
  status: 'all' | 'completed' | 'in_progress'
}

const DAY_MS = 86_400_000

/** Turn UI filter values into absolute bounds. `nowMs` is passed in (purity). */
export function resolveFilter(v: FilterValues, nowMs: number): ResolvedFilter {
  let fromMs: number | null = null
  let toMs: number | null = null
  if (v.period === '7d') fromMs = nowMs - 7 * DAY_MS
  else if (v.period === '30d') fromMs = nowMs - 30 * DAY_MS
  else if (v.period === 'custom') {
    fromMs = v.from ? new Date(`${v.from}T00:00:00`).getTime() : null
    toMs = v.to ? new Date(`${v.to}T23:59:59.999`).getTime() : null
  }
  return { fromMs, toMs, condition: v.condition, scenario: v.scenario, status: v.status }
}

export function countActiveFilters(v: FilterValues): number {
  let n = 0
  if (v.period !== 'all') n++
  if (v.condition !== 'all') n++
  if (v.scenario !== 'all') n++
  if (v.status !== 'all') n++
  return n
}

/** Apply filters to the raw dataset; downstream entities cascade by user. */
export function applyFilters(data: DashboardData, f: ResolvedFilter): DashboardData {
  const inPeriod = (createdAt: string) => {
    const t = new Date(createdAt).getTime()
    if (f.fromMs != null && t < f.fromMs) return false
    if (f.toMs != null && t > f.toMs) return false
    return true
  }

  const participants = data.participants.filter(p => {
    if (!inPeriod(p.createdAt)) return false
    if (f.status === 'completed' && p.completedAt == null) return false
    if (f.status === 'in_progress' && p.completedAt != null) return false
    return true
  })
  const userIds = new Set(participants.map(p => p.userId))

  const trials = data.trials.filter(
    t =>
      userIds.has(t.userId) &&
      (f.condition === 'all' || t.condition === f.condition) &&
      (f.scenario === 'all' || t.scenario === f.scenario),
  )
  const trialKeys = new Set(trials.map(t => `${t.userId}:${t.trialIndex}`))

  const pauseEvents = data.pauseEvents.filter(
    e =>
      userIds.has(e.userId) &&
      (f.condition === 'all' || e.condition === f.condition) &&
      (f.scenario === 'all' || e.scenario === f.scenario),
  )

  const surveys = data.surveys.filter(
    s => userIds.has(s.userId) && trialKeys.has(`${s.userId}:${s.trialIndex}`),
  )

  // Suggestions only exist for the related (word-cloud) condition.
  const suggestions =
    f.condition === 'baseline'
      ? []
      : data.suggestions.filter(
          s =>
            userIds.has(s.userId) &&
            (f.scenario === 'all' || s.scenario === f.scenario),
        )

  return { participants, trials, pauseEvents, surveys, suggestions }
}

// ---------------------------------------------------------------------------
// Per-user detail (drill-down)
// ---------------------------------------------------------------------------

export type UserTrialDetail = {
  trial: DashTrial
  pause: PauseStats
  events: DashPauseEvent[]
  survey: Partial<TrialSurveyAnswers> | null
  suggestions: DashSuggestion[]
}

export type UserDetail = {
  participant: DashParticipant
  totalPause: PauseStats
  trials: UserTrialDetail[]
}

export function buildUserDetail(
  data: DashboardData,
  userId: string,
): UserDetail | null {
  const participant = data.participants.find(p => p.userId === userId)
  if (!participant) return null

  const trials = data.trials
    .filter(t => t.userId === userId)
    .sort((a, b) => a.trialIndex - b.trialIndex)
    .map<UserTrialDetail>(t => {
      const events = data.pauseEvents
        .filter(e => e.userId === userId && e.trialIndex === t.trialIndex)
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
            a.seq - b.seq,
        )
      return {
        trial: t,
        pause: pauseStats(events.map(e => e.durationMs)),
        events,
        survey:
          data.surveys.find(
            s => s.userId === userId && s.trialIndex === t.trialIndex,
          )?.answers ?? null,
        suggestions: data.suggestions.filter(
          s => s.userId === userId && s.trialIndex === t.trialIndex,
        ),
      }
    })

  const allEvents = data.pauseEvents.filter(e => e.userId === userId)
  return {
    participant,
    totalPause: pauseStats(allEvents.map(e => e.durationMs)),
    trials,
  }
}
