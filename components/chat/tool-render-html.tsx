'use client'

import DOMPurify from 'isomorphic-dompurify'
import { useMemo, useState } from 'react'
import { Download, Maximize2, X } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type RenderHtmlPart = {
  type: 'tool-renderHtml'
  toolCallId: string
  state:
    | 'input-streaming'
    | 'input-available'
    | 'output-available'
    | 'output-error'
  input?: { html?: string }
  errorText?: string
}

const HTML_CONTENT_CLASSES =
  'text-sm leading-relaxed [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-2 [&_th]:py-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5'

const CARD_SHELL =
  'glass relative w-full max-w-[95%] overflow-hidden rounded-xl shadow-[0_8px_30px_-12px_oklch(0_0_0/30%)]'

export function ToolRenderHtml({ part }: { part: RenderHtmlPart }) {
  const html = part.input?.html ?? ''
  const sanitized = useMemo(
    () => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }),
    [html],
  )
  const [fullscreen, setFullscreen] = useState(false)

  function downloadHtml() {
    const doc = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HTML snippet</title>
<style>
  body { font-family: system-ui, -apple-system, sans-serif; margin: 2rem; max-width: 720px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; }
  th { background: #f3f4f6; text-align: left; }
  ul, ol { padding-left: 1.5rem; }
</style>
</head>
<body>
${sanitized}
</body>
</html>`
    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `humani-snippet-${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (part.state === 'input-streaming' && !html) {
    return (
      <div className={cn(CARD_SHELL, 'p-3')}>
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-2 h-4 w-1/2" />
      </div>
    )
  }

  if (part.state === 'output-error') {
    return (
      <div className={cn(CARD_SHELL, 'p-3 text-xs text-destructive')}>
        렌더 오류: {part.errorText ?? 'unknown'}
      </div>
    )
  }

  return (
    <>
      <div className={cn(CARD_SHELL, 'p-3 pt-10')}>
        <div className="absolute top-1.5 left-1.5 z-5 inline-flex items-center gap-1 rounded-full border border-glass-border bg-glass px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase backdrop-blur">
          <span className="text-brand-gradient">HTML</span>
        </div>
        <div className="absolute top-1.5 right-1.5 z-5 inline-flex items-center gap-0.5 rounded-full border border-glass-border bg-glass px-1 py-0.5 backdrop-blur">
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={downloadHtml}
            aria-label="HTML 다운로드"
          >
            <Download className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => setFullscreen(true)}
            aria-label="전체화면 보기"
          >
            <Maximize2 className="size-3.5" />
          </Button>
        </div>
        <div
          className={HTML_CONTENT_CLASSES}
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          className="top-0 left-0 flex h-dvh w-screen max-w-[100vw] translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 shadow-none sm:max-w-none"
          showCloseButton={false}
        >
          <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-glass-border px-4 py-3">
            <DialogTitle className="text-brand-gradient text-base">
              HTML 미리보기
            </DialogTitle>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={() => setFullscreen(false)}
              aria-label="닫기"
            >
              <X className="size-4" />
            </Button>
          </DialogHeader>
          <div className="flex-1 overflow-auto p-6">
            <div
              className={HTML_CONTENT_CLASSES}
              dangerouslySetInnerHTML={{ __html: sanitized }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
