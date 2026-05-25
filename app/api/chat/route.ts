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

  const result = streamText({
    model: google('gemini-3-flash-preview'),
    messages: await convertToModelMessages(messages),
    tools: { renderHtml },
    stopWhen: stepCountIs(5),
    providerOptions: {
      google: {
        thinkingConfig: {
          includeThoughts: true,
          // thinkingLevel: "minimal",
          // thinkingLevel: 'low',
          // thinkingLevel: "medium",
          thinkingLevel: "high",
        },
      },
    },
    system:
      '간결하고 친근한 한국어 어시스턴트입니다. 표, 목록, 간단한 시각화를 보여줄 때 renderHtml 도구를 사용하세요. 도구에 넘기는 html은 self-contained 여야 하며 <script>를 절대 포함하지 마세요.',
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    sendReasoning: true,
    // Force server-side id generation for assistant messages. Without this,
    // single-step responses (no tool calls) come through with an empty id,
    // which collapses with my upsert key (chat_id, client_id="") and breaks ordering.
    generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
    onFinish: ({ messages: finalMessages, isAborted, responseMessage }) => {
      // Why this filtering exists:
      //   toUIMessageStreamResponse creates an assistant "stub" message (id +
      //   empty parts) at the START of streaming, then appends parts as tokens
      //   arrive. If the client disconnects before any content is generated
      //   (e.g., the user refreshes during slow Gemini thinking), onFinish
      //   still fires — with isAborted=true and responseMessage.parts=[].
      //   Persisting that stub leaves a phantom "complete" assistant at the
      //   tail of the chat after reload, which then masquerades as a valid
      //   response and hides the retry UI.
      let toPersist = finalMessages
      if (isAborted && responseMessage) {
        const responseHasContent = responseMessage.parts.some(
          p =>
            p.type === 'text' ||
            p.type === 'reasoning' ||
            p.type.startsWith('tool-'),
        )
        if (!responseHasContent) {
          toPersist = finalMessages.filter(m => m.id !== responseMessage.id)
        }
      }
      saveMessages(id, toPersist).catch(console.error)
    },
  })
}
