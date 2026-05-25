import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { UIMessage } from 'ai'

export type ChatRow = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export type ChatUser = {
  email: string
  name: string | null
  avatarUrl: string | null
}

export async function createChat(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('chats')
    .insert({ user_id: user.id })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function listChats(): Promise<ChatRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chats')
    .select('id, title, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getMostRecentChatId(): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('chats')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

export async function loadChat(chatId: string): Promise<UIMessage[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('messages')
    .select('client_id, role, parts')
    .eq('chat_id', chatId)
    .order('position', { ascending: true })
  if (error) throw error
  return (data ?? []).map(row => ({
    id: row.client_id as string,
    role: row.role as UIMessage['role'],
    parts: row.parts as UIMessage['parts'],
  }))
}

export async function saveMessages(
  chatId: string,
  messages: UIMessage[],
): Promise<void> {
  const supabase = await createClient()

  // Defensive guards before persisting:
  //   1. drop messages with empty/missing id (server-side generateMessageId
  //      should prevent this, but if it ever slips through we don't want to
  //      collide on the (chat_id, "") upsert key)
  //   2. drop assistant messages that only have structural parts (step-start
  //      with no text/tool/reasoning). These come from aborted streams when
  //      the client disconnects mid-response, and saving them leaves a
  //      "phantom" assistant at the tail of the chat after refresh.
  const safeMessages = messages.filter(m => {
    if (!m.id) {
      console.warn('[saveMessages] dropping message with empty id', m)
      return false
    }
    if (m.role === 'assistant') {
      const hasContent = m.parts.some(
        p =>
          p.type === 'text' ||
          p.type === 'reasoning' ||
          p.type.startsWith('tool-'),
      )
      if (!hasContent) {
        console.warn(
          '[saveMessages] dropping empty assistant message',
          m.id,
        )
        return false
      }
    }
    return true
  })

  // Dedupe by client_id while preserving FIRST-occurrence position.
  // Multi-step agent flows can emit the same id more than once in the array;
  // taking the latest content but anchoring to the first index keeps order
  // stable across saves.
  const byId = new Map<
    string,
    { msg: UIMessage; position: number }
  >()
  safeMessages.forEach((m, i) => {
    const existing = byId.get(m.id)
    byId.set(m.id, {
      msg: m,
      position: existing ? existing.position : i,
    })
  })

  const rows = Array.from(byId.values()).map(({ msg, position }) => ({
    chat_id: chatId,
    client_id: msg.id,
    position,
    role: msg.role,
    parts: msg.parts,
  }))

  const { error } = await supabase
    .from('messages')
    .upsert(rows, { onConflict: 'chat_id,client_id' })
  if (error) throw error

  await supabase
    .from('chats')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', chatId)
}
