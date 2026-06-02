'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Re-runs the (force-dynamic) server component to re-fetch fresh data. */
export function RefreshButton() {
  const router = useRouter()
  const [pending, start] = useTransition()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(() => router.refresh())}
    >
      <RotateCcw className={cn('size-3.5', pending && 'animate-spin')} />
      {pending ? '갱신 중…' : '새로고침'}
    </Button>
  )
}
