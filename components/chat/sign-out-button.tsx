import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action="/auth/sign-out" method="POST" className={cn(className)}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="w-full justify-start gap-2"
      >
        <LogOut className="size-4" />
        로그아웃
      </Button>
    </form>
  )
}
