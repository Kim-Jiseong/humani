import { DesktopBlock } from './desktop-block'

// Width-based mobile guard.
// Renders both branches and lets Tailwind's `md` breakpoint (≥768px) decide
// which one is visible. CSS-only — no UA sniffing, no hydration mismatch,
// resizing the viewport swaps without re-render.
export function ResponsiveGuard({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="md:hidden">{children}</div>
      <DesktopBlock className="hidden md:flex" />
    </>
  )
}
