'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import type { InAppBrowserKind } from '@/lib/is-in-app-browser'

type Kind = Exclude<InAppBrowserKind, null>

const BROWSER_LABEL: Record<Kind, string> = {
  kakaotalk: '카카오톡',
  instagram: '인스타그램',
  facebook: '페이스북',
  naver: '네이버',
  line: '라인',
}

const MENU_HINT: Record<Kind, string> = {
  kakaotalk: "우측 상단 ⋯ 메뉴 → '다른 브라우저로 열기'",
  instagram: "우측 상단 ⋯ 메뉴 → '외부 브라우저에서 열기'",
  facebook: "우측 상단 ⋯ 메뉴 → '외부 브라우저에서 열기'",
  naver: "우측 상단 메뉴 → '다른 브라우저로 열기'",
  line: "우측 하단 메뉴 → '다른 앱에서 열기'",
}

function buildExternalUrl(kind: Kind, isAndroid: boolean, href: string): string | null {
  if (kind === 'kakaotalk') {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(href)}`
  }
  if (isAndroid) {
    const stripped = href.replace(/^https?:\/\//, '')
    const scheme = href.startsWith('https') ? 'https' : 'http'
    return `intent://${stripped}#Intent;scheme=${scheme};package=com.android.chrome;end`
  }
  return null
}

export function InAppBrowserBlock({
  kind,
  isAndroid,
}: {
  kind: Kind
  isAndroid: boolean
}) {
  useEffect(() => {
    const href = window.location.href
    const target = buildExternalUrl(kind, isAndroid, href)
    if (!target) return
    window.location.href = target
  }, [kind, isAndroid])

  function openExternal() {
    const href = window.location.href
    const target = buildExternalUrl(kind, isAndroid, href)
    if (!target) {
      toast.info('우측 상단 메뉴에서 외부 브라우저로 열어주세요')
      return
    }
    window.location.href = target
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('주소가 복사되었습니다')
    } catch {
      toast.error('주소 복사에 실패했습니다')
    }
  }

  const canAutoOpen = kind === 'kakaotalk' || isAndroid
  const label = BROWSER_LABEL[kind]
  const hint = MENU_HINT[kind]

  return (
    <div className="flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-background p-8 text-center">
      <div className="text-6xl" aria-hidden>
        🌐
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        외부 브라우저에서 열어주세요
      </h1>
      <p className="max-w-xs text-balance text-sm text-muted-foreground">
        {label} 인앱 브라우저에서는 Google 로그인이 지원되지 않습니다.
        <br />
        Chrome, Safari 등 외부 브라우저에서 다시 접속해 주세요.
      </p>
      <div className="flex w-full max-w-xs flex-col gap-2">
        {canAutoOpen ? (
          <Button onClick={openExternal} size="lg" variant="glass">
            외부 브라우저에서 열기
          </Button>
        ) : null}
        <Button onClick={copyUrl} size="lg" variant="ghost">
          주소 복사하기
        </Button>
      </div>
      <p className="max-w-xs text-balance text-xs text-muted-foreground">
        버튼이 동작하지 않는 경우
        <br />
        {hint}를 선택해주세요.
      </p>
    </div>
  )
}
