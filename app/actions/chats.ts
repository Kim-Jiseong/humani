'use server'

import { redirect } from 'next/navigation'
import { createChat } from '@/lib/db/chats'

export async function createNewChatAction() {
  const id = await createChat()
  redirect(`/chats/${id}`)
}
