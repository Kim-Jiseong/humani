import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getParticipant, type Participant } from '@/lib/db/experiment'
import { STEP_ROUTE, type Step } from '@/lib/experiment/config'

async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return user
}

/**
 * Gate for the survey entry. The participant row does not exist yet here, so the
 * only valid state is "logged in with no participant". If a participant already
 * exists, the survey is already done → bounce to their current step.
 */
export async function requireSurveyStep(): Promise<void> {
  await requireUser()
  const participant = await getParticipant()
  if (participant) redirect(STEP_ROUTE[participant.currentStep])
}

/**
 * Gate for every non-survey step. Forward-only and single-step: the request must
 * match the participant's persisted current_step exactly, otherwise we redirect
 * to wherever they actually are. This enforces:
 *   - resume-from-current-step on refresh / new tab
 *   - no jumping ahead via deep link
 *   - no revisiting a passed scenario
 *   - full lock-out once `done`
 */
export async function requireStep(
  requested: Exclude<Step, 'survey'>,
): Promise<Participant> {
  await requireUser()
  const participant = await getParticipant()
  if (!participant) redirect('/survey')
  if (requested !== participant.currentStep) {
    redirect(STEP_ROUTE[participant.currentStep])
  }
  return participant
}
