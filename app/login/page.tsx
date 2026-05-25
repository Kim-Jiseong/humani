import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignInButton } from '@/components/chat/sign-in-button'
import { BrandOrb } from '@/components/brand-orb'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <div className="relative flex min-h-svh items-center justify-center px-6 py-12">
      <div className="glass shadow-glow-brand relative flex w-full max-w-xs flex-col items-center gap-7 rounded-3xl px-7 py-10 text-center">
        <BrandOrb size="lg" />
        <div className="space-y-2">
          <h1 className="text-brand-gradient text-3xl font-semibold tracking-tight">
            Humani
          </h1>
          <p className="text-sm text-muted-foreground">
            로그인 후 대화를 시작하세요.
          </p>
        </div>
        <SignInButton />
      </div>
    </div>
  )
}
