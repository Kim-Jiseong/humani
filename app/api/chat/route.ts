import { google } from '@ai-sdk/google'
import {
  convertToModelMessages,
  createIdGenerator,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from 'ai'
import { z } from 'zod'
import { saveMessages } from '@/lib/db/chats'
import { getTrialByChatId } from '@/lib/db/experiment'
import {
  GENERAL_SYSTEM_PROMPT,
  scenarioSystemPrompt,
} from '@/lib/experiment/chat-prompts'

export const maxDuration = 30

const renderHtml = tool({
  description:
    'Render an HTML snippet inside the chat UI. Use this when a table, list, or simple visualisation communicates the answer better than plain text. The html must be self-contained: inline styles only, no <script>, no external resources.',
  inputSchema: z.object({
    html: z
      .string()
      .describe(
        'Self-contained HTML string. Inline styles only. Never include <script> tags or external resource references.',
      ),
  }),
  execute: async ({ html }) => ({ rendered: true, length: html.length }),
})

export async function POST(req: Request) {
  const { messages, id }: { messages: UIMessage[]; id: string } =
    await req.json()

  // Pick the system prompt by scenario. A trial chat resolves to its scenario's
  // one-shot completion prompt; a free chat (no trial) falls back to general.
  const trial = await getTrialByChatId(id).catch(() => null)
  const system = trial
    ? scenarioSystemPrompt(trial.scenario)
    : GENERAL_SYSTEM_PROMPT

  const result = streamText({
    model: google('gemini-3-flash-preview'),
    messages: await convertToModelMessages(messages),
    tools: { renderHtml },
    stopWhen: stepCountIs(5),
    providerOptions: {
      google: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: 'high',
        },
      },
    },
    system,
    onAbort: ({ steps }) => {
      console.warn(
        `[streamText] aborted after ${steps.length} step(s) — onFinish will not include a complete assistant`,
      )
    },
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    // Server-side id generation so every assistant message has a stable,
    // non-empty client_id — required for upsert's (chat_id, client_id) key.
    generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
    onFinish: async ({ messages: finalMessages, isAborted }) => {
      // Save ONLY after generation fully completes. If the client disconnected
      // mid-stream (e.g., user refreshed during slow Gemini thinking), the
      // backend aborts naturally — we do NOT want to persist a half-formed
      // conversation. The trailing user message will be picked up by the
      // stale-detection UI on next load and the user can hit "다시 시도".
      if (isAborted) {
        console.warn('[onFinish] stream aborted — not persisting')
        return
      }
      // Await so messages are committed before the client sees the stream end
      // (and shows "다음"). Keeps persistence reliable and lockedInitially
      // correct on reload; the step advance no longer re-reads these messages.
      try {
        await saveMessages(id, finalMessages)
      } catch (err) {
        console.error('[onFinish] saveMessages failed', err)
      }
    },
  })
}
