'use client'

import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function SignInButton() {
  async function signIn() {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) toast.error(`로그인 실패: ${error.message}`)
  }

  return (
    <Button
      onClick={signIn}
      size="lg"
      variant="glass"
      className="h-11 w-full max-w-xs gap-2 px-4 font-medium"
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <path
          fill="currentColor"
          d="M21.35 11.1H12v3.2h5.35c-.23 1.5-1.7 4.4-5.35 4.4-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.46C16.7 4.27 14.6 3.25 12 3.25 6.97 3.25 2.9 7.32 2.9 12.35S6.97 21.45 12 21.45c6.93 0 9.5-4.87 9.5-7.34 0-.5-.05-.86-.15-1.3z"
        />
      </svg>
      Google로 로그인
    </Button>
  )
}
