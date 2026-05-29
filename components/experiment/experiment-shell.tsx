import { ThemeToggle } from '@/components/theme-toggle'

/**
 * Shared mobile container for the non-chat experiment steps (survey, intro,
 * scenario, post-trial survey, done). Mirrors the chat header (brand title +
 * theme toggle) and centers/scrolls its content. The chat step does NOT use
 * this — it has its own full-height layout.
 */
export function ExperimentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
      <header className="flex h-14 shrink-0 items-center justify-between">
        <span className="text-brand-gradient text-base font-semibold tracking-tight">
          Humani
        </span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  )
}
