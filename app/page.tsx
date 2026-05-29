import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getParticipant } from '@/lib/db/experiment'
import { STEP_ROUTE } from '@/lib/experiment/config'

// Step router. No UI — sends the participant to wherever they are in the flow.
export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const participant = await getParticipant()
  if (!participant) redirect('/survey')
  redirect(STEP_ROUTE[participant.currentStep])
}
