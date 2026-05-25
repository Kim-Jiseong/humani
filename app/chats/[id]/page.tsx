import { redirect } from 'next/navigation'
import { Chat } from '@/components/chat/chat'
import { listChats, loadChat, type ChatUser } from '@/lib/db/chats'
import { createClient } from '@/lib/supabase/server'

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const meta = user.user_metadata ?? {}
  const chatUser: ChatUser = {
    email: user.email ?? '',
    name: (meta.full_name as string) || (meta.name as string) || null,
    avatarUrl:
      (meta.avatar_url as string) || (meta.picture as string) || null,
  }

  const [initialMessages, chats] = await Promise.all([
    loadChat(id),
    listChats(),
  ])

  return (
    <Chat
      id={id}
      initialMessages={initialMessages}
      chats={chats}
      user={chatUser}
    />
  )
}
