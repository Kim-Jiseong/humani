import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action="/auth/sign-out" method="POST" className={className}>
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        aria-label="로그아웃"
      >
        <LogOut className="size-4" />
      </Button>
    </form>
  )
}
