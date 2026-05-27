'use client'

import { useFormStatus } from 'react-dom'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

type Variant = 'ghost' | 'glass'
type Size = 'icon-sm' | 'sm'

export function NewChatSubmit({
  variant = 'ghost',
  size = 'icon-sm',
  className,
  showLabel = false,
  onClick,
}: {
  variant?: Variant
  size?: Size
  className?: string
  showLabel?: boolean
  onClick?: () => void
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      aria-busy={pending}
      aria-label="새 채팅"
      onClick={onClick}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Plus className="size-4" />
      )}
      {showLabel && <span>{pending ? '새 채팅 만드는 중…' : '새 채팅'}</span>}
    </Button>
  )
}
