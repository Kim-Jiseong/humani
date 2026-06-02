import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { createChat } from '@/lib/db/chats'
import {
  planFor,
  type Condition,
  type Gender,
  type GroupType,
  type LlmFrequency,
  type ScenarioKey,
  type Step,
  type TrialIndex,
} from '@/lib/experiment/config'

type ServerSupabase = Awaited<ReturnType<typeof createClient>>

export type Participant = {
  userId: string
  seq: number
  groupType: GroupType
  age: number
  gender: Gender
  llmFrequency: LlmFrequency
  currentStep: Step
  completedAt: string | null
}

export type Trial = {
  id: string
  trialIndex: TrialIndex
  scenario: ScenarioKey
  condition: Condition
  chatId: string | null
  submittedAt: string | null
}

const PARTICIPANT_COLUMNS =
  'user_id, seq, group_type, age, gender, llm_frequency, current_step, completed_at'
const TRIAL_COLUMNS =
  'id, trial_index, scenario, condition, chat_id, submitted_at'

async function requireUserId(supabase: ServerSupabase): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapParticipant(row: any): Participant {
  return {
    userId: row.user_id,
    seq: Number(row.seq),
    groupType: row.group_type as GroupType,
    age: row.age,
    gender: row.gender as Gender,
    llmFrequency: row.llm_frequency as LlmFrequency,
    currentStep: row.current_step as Step,
    completedAt: row.completed_at ?? null,
  }
}

function mapTrial(row: any): Trial {
  return {
    id: row.id,
    trialIndex: row.trial_index as TrialIndex,
    scenario: row.scenario as ScenarioKey,
    condition: row.condition as Condition,
    chatId: row.chat_id ?? null,
    submittedAt: row.submitted_at ?? null,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** The caller's participant row, or null if they haven't submitted the survey yet. */
export async function getParticipant(): Promise<Participant | null> {
  const supabase = await createClient()
  // RLS restricts the result to the caller's own row (at most one).
  const { data, error } = await supabase
    .from('experiment_participants')
    .select(PARTICIPANT_COLUMNS)
    .maybeSingle()
  if (error) throw error
  return data ? mapParticipant(data) : null
}

/** Insert the participant row. The DB trigger assigns seq + group_type. */
export async function createParticipant(input: {
  age: number
  gender: Gender
  llmFrequency: LlmFrequency
}): Promise<Participant> {
  const supabase = await createClient()
  const userId = await requireUserId(supabase)

  const { data, error } = await supabase
    .from('experiment_participants')
    .insert({
      user_id: userId,
      age: input.age,
      gender: input.gender,
      llm_frequency: input.llmFrequency,
      current_step: 'intro', // survey just completed
    })
    .select(PARTICIPANT_COLUMNS)
    .single()
  if (error) throw error
  return mapParticipant(data)
}

/** Advance/set the participant's step pointer; stamps completed_at on 'done'. */
export async function setCurrentStep(step: Step): Promise<void> {
  const supabase = await createClient()
  const userId = await requireUserId(supabase)

  const patch: Record<string, unknown> = {
    current_step: step,
    updated_at: new Date().toISOString(),
  }
  if (step === 'done') patch.completed_at = new Date().toISOString()

  const { error } = await supabase
    .from('experiment_participants')
    .update(patch)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getTrial(trialIndex: TrialIndex): Promise<Trial | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('experiment_trials')
    .select(TRIAL_COLUMNS)
    .eq('trial_index', trialIndex)
    .maybeSingle()
  if (error) throw error
  return data ? mapTrial(data) : null
}

/**
 * Look up the trial backing a given chat. Returns null for free (non-trial)
 * chats. RLS scopes this to the caller's own trials.
 */
export async function getTrialByChatId(chatId: string): Promise<Trial | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('experiment_trials')
    .select(TRIAL_COLUMNS)
    .eq('chat_id', chatId)
    .maybeSingle()
  if (error) throw error
  return data ? mapTrial(data) : null
}

/**
 * Return the trial row for `trialIndex`, creating it (and its backing chat) on
 * first call. Scenario + condition are derived from the participant's group_type
 * and frozen on the row. Idempotent: a second call returns the existing row.
 */
export async function ensureTrial(trialIndex: TrialIndex): Promise<Trial> {
  const existing = await getTrial(trialIndex)
  if (existing) return existing

  const participant = await getParticipant()
  if (!participant) throw new Error('No participant — survey not completed')

  const plan = planFor(participant.groupType, trialIndex)
  const chatId = await createChat()

  const supabase = await createClient()
  const userId = await requireUserId(supabase)
  const { data, error } = await supabase
    .from('experiment_trials')
    .insert({
      user_id: userId,
      trial_index: trialIndex,
      scenario: plan.scenario,
      condition: plan.condition,
      chat_id: chatId,
    })
    .select(TRIAL_COLUMNS)
    .single()

  if (error) {
    // Lost a race (unique user_id,trial_index) — return whoever won.
    const retry = await getTrial(trialIndex)
    if (retry) return retry
    throw error
  }
  return mapTrial(data)
}

/** Stamp submitted_at once (first completed chat turn). */
export async function markTrialSubmitted(trialIndex: TrialIndex): Promise<void> {
  const supabase = await createClient()
  const userId = await requireUserId(supabase)
  const { error } = await supabase
    .from('experiment_trials')
    .update({ submitted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('trial_index', trialIndex)
    .is('submitted_at', null)
  if (error) throw error
}
