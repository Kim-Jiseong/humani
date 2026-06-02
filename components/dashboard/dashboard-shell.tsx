'use client'

import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

const subscribe = () => () => {}

/**
 * The app is mobile-only: the root layout's `ResponsiveGuard` hides all page
 * content behind `md:hidden` on desktop and shows a "mobile only" block. The
 * dashboard is a desktop research tool, so it must escape that guard. We portal
 * into `document.body` (outside the hidden ancestor) and render a fixed,
 * opaque, full-screen overlay that covers the DesktopBlock on every width.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  // Render nothing until hydrated on the client (createPortal needs `document`,
  // and this keeps SSR output matching the first client render). Uses
  // useSyncExternalStore instead of a mount effect to avoid setState-in-effect.
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
  if (!hydrated) return null

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-auto bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>,
    document.body,
  )
}
