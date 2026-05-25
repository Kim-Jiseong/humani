import { cn } from '@/lib/utils'

export function DesktopBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-background p-8 text-center',
        className,
      )}
    >
      <div className="text-6xl" aria-hidden>
        📱
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">
        모바일 전용 서비스
      </h1>
      <p className="max-w-xs text-balance text-sm text-muted-foreground">
        이 앱은 스마트폰에 최적화되어 있습니다.
        <br />
        모바일 브라우저로 다시 접속해 주세요.
      </p>
    </div>
  )
}
