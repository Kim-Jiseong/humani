import { notFound, redirect } from 'next/navigation'
import { requireStep } from '@/lib/experiment/guard'
import { createClient } from '@/lib/supabase/server'
import { ensureTrial, getTrial } from '@/lib/db/experiment'
import { loadChat, type ChatUser } from '@/lib/db/chats'
import { Chat } from '@/components/chat/chat'
import { TrialChat } from '@/components/experiment/trial-chat'
import { SCENARIO_TEXT, parseTrialIndex, trialStep } from '@/lib/experiment/config'

export default async function TrialChatPage({
  params,
}: {
  params: Promise<{ n: string }>
}) {
  const { n } = await params
  const trialIndex = parseTrialIndex(n)
  if (!trialIndex) notFound()

  const step = trialStep('chat', trialIndex)
  await requireStep(step)

  // The trial + its chat are created on advance into this step; be defensive.
  const trial = (await getTrial(trialIndex)) ?? (await ensureTrial(trialIndex))
  if (!trial.chatId) redirect('/')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const meta = user?.user_metadata ?? {}
  const chatUser: ChatUser = {
    email: user?.email ?? '',
    name: (meta.full_name as string) || (meta.name as string) || null,
    avatarUrl:
      (meta.avatar_url as string) || (meta.picture as string) || null,
  }

  const initialMessages = await loadChat(trial.chatId)
  // The chat is "done" once a completed user+assistant turn is persisted (the
  // API only saves on a non-aborted finish), or once we've stamped submission.
  const lockedInitially =
    !!trial.submittedAt ||
    (initialMessages.some(m => m.role === 'assistant') &&
      initialMessages.some(m => m.role === 'user'))

  const scenario = SCENARIO_TEXT[trial.scenario]

  return (
    <TrialChat
      trialIndex={trialIndex}
      scenario={scenario}
      startInChat={lockedInitially}
    >
      <Chat
        id={trial.chatId}
        initialMessages={initialMessages}
        chats={[]}
        user={chatUser}
        experiment={{
          trialIndex,
          condition: trial.condition,
          scenario: trial.scenario,
          chatStep: step,
          lockedInitially,
        }}
      />
    </TrialChat>
  )
}
