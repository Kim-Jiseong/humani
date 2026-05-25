import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SignInButton } from '@/components/chat/sign-in-button'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) redirect('/')

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-10 px-6 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="text-5xl" aria-hidden>
          💬
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Humani</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          로그인 후 대화를 시작하세요.
        </p>
      </div>
      <SignInButton />
    </div>
  )
}
