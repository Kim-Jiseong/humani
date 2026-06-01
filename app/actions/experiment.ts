'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  createParticipant,
  ensureTrial,
  getParticipant,
  getTrial,
  markTrialSubmitted,
  setCurrentStep,
} from '@/lib/db/experiment'
import {
  GENDER_OPTIONS,
  LLM_FREQUENCY_OPTIONS,
  STEP_ROUTE,
  nextStep,
  trialStep,
  type Gender,
  type LlmFrequency,
  type Step,
  type TrialIndex,
} from '@/lib/experiment/config'
import {
  sanitizeSurveyAnswers,
  type TrialSurveyAnswers,
} from '@/lib/experiment/survey'

function parseTrialStep(
  step: Step,
): { n: TrialIndex; phase: 'scenario' | 'chat' | 'survey' } | null {
  const m = /^trial([12])_(scenario|chat|survey)$/.exec(step)
  if (!m) return null
  return {
    n: Number(m[1]) as TrialIndex,
    phase: m[2] as 'scenario' | 'chat' | 'survey',
  }
}

/**
 * Demographics survey submit. Creates the participant row (DB trigger assigns
 * seq + group_type) and moves to the intro step. Idempotent: a re-submit by an
 * existing participant is ignored (no second seq) and bounces to current step.
 */
export async function submitSurveyAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const existing = await getParticipant()
  if (existing) redirect(STEP_ROUTE[existing.currentStep])

  const age = Number(formData.get('age'))
  const gender = formData.get('gender') as Gender
  const llmFrequency = formData.get('llm_frequency') as LlmFrequency

  const validAge = Number.isInteger(age) && age >= 1 && age <= 120
  const validGender = GENDER_OPTIONS.some(o => o.value === gender)
  const validFreq = LLM_FREQUENCY_OPTIONS.some(o => o.value === llmFrequency)
  if (!validAge || !validGender || !validFreq) {
    // Client validates first; this is a defensive bounce for malformed posts.
    redirect('/survey')
  }

  await createParticipant({ age, gender, llmFrequency })
  redirect('/intro')
}

/**
 * The single forward-advance primitive. Moves current_step from `from` to the
 * next step, but only when the DB still says the participant is on `from`
 * (defeats double-clicks and stale tabs). Handles trial-chat side effects:
 *   - entering a chat step ensures the trial row + backing chat exist
 *   - leaving a chat step requires a completed turn, then stamps submitted_at
 */
export async function advanceStepAction(from: Step): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const participant = await getParticipant()
  if (!participant) redirect('/survey')
  if (participant.currentStep !== from) {
    redirect(STEP_ROUTE[participant.currentStep])
  }

  const next = nextStep(from)
  if (next === from) redirect(STEP_ROUTE[from]) // terminal (done)

  const fromInfo = parseTrialStep(from)
  const nextInfo = parseTrialStep(next)

  // Entering a chat step → make sure the trial + its chat exist before render.
  if (nextInfo?.phase === 'chat') {
    await ensureTrial(nextInfo.n)
  }

  // Leaving a chat step → stamp submission. We intentionally do NOT re-read the
  // chat from the DB to "verify" a completed turn here: that read raced with the
  // async message save in /api/chat and, when the user clicked "다음" quickly,
  // bounced them back into the chat step (which shows the scenario recap) — a
  // loop. The client only renders the "다음" CTA after the turn completes, so
  // reaching here already implies a completed turn.
  if (fromInfo?.phase === 'chat') {
    await markTrialSubmitted(fromInfo.n)
  }

  await setCurrentStep(next)
  redirect(STEP_ROUTE[next])
}

/**
 * Persist the post-trial survey response, then advance. Validates server-side
 * (TLX 0..100 step 5; the two condition items required only when the trial's
 * condition is 'related'). Upserts so a re-submit overwrites (needs the unique
 * index on (user_id, trial_index)). Reuses advanceStepAction for the step move.
 */
export async function submitTrialSurveyAction(
  trialIndex: TrialIndex,
  answers: TrialSurveyAnswers,
): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const participant = await getParticipant()
  if (!participant) redirect('/survey')

  const step = trialStep('survey', trialIndex)
  if (participant.currentStep !== step) {
    redirect(STEP_ROUTE[participant.currentStep])
  }

  const trial = await getTrial(trialIndex)
  const clean = sanitizeSurveyAnswers(answers, trial?.condition === 'related')
  if (!clean) redirect(STEP_ROUTE[step]) // invalid payload — client validates first

  const { error } = await supabase
    .from('experiment_survey_responses')
    .upsert(
      { user_id: user.id, trial_index: trialIndex, answers: clean },
      { onConflict: 'user_id,trial_index' },
    )
  if (error) throw error

  await advanceStepAction(step)
}
