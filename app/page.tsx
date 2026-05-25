import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createChat, getMostRecentChatId } from '@/lib/db/chats'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const id = (await getMostRecentChatId()) ?? (await createChat())
  redirect(`/chats/${id}`)
}
