'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const subscribe = () => () => {}
const getSnapshot = () => true
const getServerSnapshot = () => false

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  // next-themes resolves on the client; gate animation until then so SSR markup
  // matches the first client paint (otherwise Sun/Moon flip on hydration).
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
      className={className}
    >
      <span className="relative inline-block size-4">
        <Sun
          className={cn(
            'absolute inset-0 size-4 transition-transform duration-300',
            isDark ? 'rotate-90 scale-0' : 'rotate-0 scale-100',
          )}
        />
        <Moon
          className={cn(
            'absolute inset-0 size-4 transition-transform duration-300',
            isDark ? 'rotate-0 scale-100' : '-rotate-90 scale-0',
          )}
        />
      </span>
    </Button>
  )
}
