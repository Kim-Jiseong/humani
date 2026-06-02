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

export async function fetchDashboardData(): Promise<DashboardData> {
  const supabase = createAdminClient()

  const [participants, trials, pauseEvents, surveys, suggestions] =
    await Promise.all([
      supabase
        .from('experiment_participants')
        .select(
          'user_id, seq, group_type, age, gender, llm_frequency, current_step, completed_at, created_at',
        )
        .order('seq', { ascending: true }),
      supabase
        .from('experiment_trials')
        .select('user_id, trial_index, scenario, condition, chat_id, submitted_at'),
      supabase
        .from('chat_pause_events')
        .select(
          'user_id, trial_index, scenario, condition, suggest_active, seq, duration_ms, query_eojeol, suggested_words, created_at',
        )
        .order('created_at', { ascending: true }),
      supabase
        .from('experiment_survey_responses')
        .select('user_id, trial_index, answers'),
      supabase
        .from('experiment_suggestions')
        .select(
          'user_id, trial_index, scenario, query_eojeol, query_word, suggested_words, similarities, created_at',
        )
        .order('created_at', { ascending: true }),
    ])

  for (const res of [participants, trials, pauseEvents, surveys, suggestions]) {
    if (res.error) throw res.error
  }

  return {
    participants: (participants.data ?? []).map(mapParticipant),
    trials: (trials.data ?? []).map(mapTrial),
    pauseEvents: (pauseEvents.data ?? []).map(mapPause),
    surveys: (surveys.data ?? []).map(mapSurvey),
    suggestions: (suggestions.data ?? []).map(mapSuggestion),
  }
}
