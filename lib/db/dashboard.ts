import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  Condition,
  Gender,
  GroupType,
  LlmFrequency,
  ScenarioKey,
  Step,
  TrialIndex,
} from '@/lib/experiment/config'
import type { TrialSurveyAnswers } from '@/lib/experiment/survey'

// Raw datasets for the dashboard, read across ALL participants via the
// service-role client (RLS bypassed). At the current data scale, fetching whole
// tables and aggregating in JS (lib/dashboard/aggregate.ts) is simplest and
// gives us flexibility for medians etc.

export type DashParticipant = {
  userId: string
  seq: number
  groupType: GroupType
  age: number
  gender: Gender
  llmFrequency: LlmFrequency
  currentStep: Step
  completedAt: string | null
  createdAt: string
}

export type DashTrial = {
  userId: string
  trialIndex: TrialIndex
  scenario: ScenarioKey
  condition: Condition
  chatId: string | null
  submittedAt: string | null
}

export type DashPauseEvent = {
  userId: string
  trialIndex: TrialIndex | null
  scenario: ScenarioKey | null
  condition: Condition | null
  suggestActive: boolean
  seq: number
  durationMs: number
  queryEojeol: string | null
  suggestedWords: string[] | null
  createdAt: string
}

export type DashSurvey = {
  userId: string
  trialIndex: TrialIndex | null
  answers: Partial<TrialSurveyAnswers>
}

export type DashSuggestion = {
  userId: string
  trialIndex: TrialIndex
  scenario: ScenarioKey
  queryEojeol: string
  queryWord: string
  suggestedWords: string[]
  similarities: number[]
  createdAt: string
}

export type DashboardData = {
  participants: DashParticipant[]
  trials: DashTrial[]
  pauseEvents: DashPauseEvent[]
  surveys: DashSurvey[]
  suggestions: DashSuggestion[]
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapParticipant(r: any): DashParticipant {
  return {
    userId: r.user_id,
    seq: Number(r.seq),
    groupType: r.group_type as GroupType,
    age: r.age,
    gender: r.gender as Gender,
    llmFrequency: r.llm_frequency as LlmFrequency,
    currentStep: r.current_step as Step,
    completedAt: r.completed_at ?? null,
    createdAt: r.created_at,
  }
}

function mapTrial(r: any): DashTrial {
  return {
    userId: r.user_id,
    trialIndex: r.trial_index as TrialIndex,
    scenario: r.scenario as ScenarioKey,
    condition: r.condition as Condition,
    chatId: r.chat_id ?? null,
    submittedAt: r.submitted_at ?? null,
  }
}

function mapPause(r: any): DashPauseEvent {
  return {
    userId: r.user_id,
    trialIndex: (r.trial_index ?? null) as TrialIndex | null,
    scenario: (r.scenario ?? null) as ScenarioKey | null,
    condition: (r.condition ?? null) as Condition | null,
    suggestActive: !!r.suggest_active,
    seq: Number(r.seq),
    durationMs: Number(r.duration_ms),
    queryEojeol: r.query_eojeol ?? null,
    suggestedWords: r.suggested_words ?? null,
    createdAt: r.created_at,
  }
}

function mapSurvey(r: any): DashSurvey {
  return {
    userId: r.user_id,
    trialIndex: (r.trial_index ?? null) as TrialIndex | null,
    answers: (r.answers ?? {}) as Partial<TrialSurveyAnswers>,
  }
}

function mapSuggestion(r: any): DashSuggestion {
  return {
    userId: r.user_id,
    trialIndex: r.trial_index as TrialIndex,
    scenario: r.scenario as ScenarioKey,
    queryEojeol: r.query_eojeol,
    queryWord: r.query_word,
    suggestedWords: r.suggested_words ?? [],
    similarities: r.similarities ?? [],
    createdAt: r.created_at,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// PostgREST caps each request at a fixed number of rows (Supabase default 1000),
// so a plain .select() silently truncates once a table grows past that. Page
// through with .range() in PAGE-sized chunks until a short page signals the end.
// chat_pause_events / experiment_suggestions both exceed 1000 rows now, and only
// these read paths need the full set — the per-user write paths stay scoped by RLS.
const PAGE = 1000

type SupabaseAdmin = ReturnType<typeof createAdminClient>

// Exported so the data-export route (lib/db/export.ts consumers) shares this one
// paginator instead of re-implementing the .range() loop.
export async function fetchAll(
  supabase: SupabaseAdmin,
  table: string,
  columns: string,
  order?: { column: string; ascending: boolean },
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += PAGE) {
    let query = supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1)
    if (order) query = query.order(order.column, { ascending: order.ascending })
    const { data, error } = await query
    if (error) throw error
    const batch = (data ?? []) as unknown as Record<string, unknown>[]
    rows.push(...batch)
    if (batch.length < PAGE) break
  }
  return rows
}

export async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = createAdminClient()

  const [participants, trials, pauseEvents, surveys, suggestions] =
    await Promise.all([
      fetchAll(
        supabase,
        'experiment_participants',
        'user_id, seq, group_type, age, gender, llm_frequency, current_step, completed_at, created_at',
        { column: 'seq', ascending: true },
      ),
      fetchAll(
        supabase,
        'experiment_trials',
        'user_id, trial_index, scenario, condition, chat_id, submitted_at',
      ),
      fetchAll(
        supabase,
        'chat_pause_events',
        'user_id, trial_index, scenario, condition, suggest_active, seq, duration_ms, query_eojeol, suggested_words, created_at',
        { column: 'created_at', ascending: true },
      ),
      fetchAll(
        supabase,
        'experiment_survey_responses',
        'user_id, trial_index, answers',
      ),
      fetchAll(
        supabase,
        'experiment_suggestions',
        'user_id, trial_index, scenario, query_eojeol, query_word, suggested_words, similarities, created_at',
        { column: 'created_at', ascending: true },
      ),
    ])

  return {
    participants: participants.map(mapParticipant),
    trials: trials.map(mapTrial),
    pauseEvents: pauseEvents.map(mapPause),
    surveys: surveys.map(mapSurvey),
    suggestions: suggestions.map(mapSuggestion),
  }
}
