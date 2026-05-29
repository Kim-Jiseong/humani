'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadChat } from '@/lib/db/chats'
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
  type Gender,
  type LlmFrequency,
  type Step,
  type TrialIndex,
} from '@/lib/experiment/config'

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

  // Leaving a chat step → must have a completed user+assistant turn persisted.
  if (fromInfo?.phase === 'chat') {
    const trial = await getTrial(fromInfo.n)
    const msgs = trial?.chatId ? await loadChat(trial.chatId) : []
    const completed =
      msgs.some(m => m.role === 'assistant') && msgs.some(m => m.role === 'user')
    if (!completed) redirect(STEP_ROUTE[from]) // not finished — stay on chat
    await markTrialSubmitted(fromInfo.n)
  }

  await setCurrentStep(next)
  redirect(STEP_ROUTE[next])
}
