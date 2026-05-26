import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { ResponsiveGuard } from '@/components/responsive-guard'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Humani',
  description: 'Humani — 모바일 에이전트 챗봇',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  // Shrink the layout viewport when the on-screen keyboard appears so
  // `100dvh` reflects the visible area. Composer (anchored at the bottom of
  // a `h-dvh` flex container) stays just above the keyboard instead of the
  // whole page scrolling up.
  interactiveWidget: 'resizes-content',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9fafb' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0d12' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="relative min-h-full">
        <ThemeProvider
          attribute="class"
          // defaultTheme="system"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* Global ambient layers — sit behind everything; pointer-events:none
              so they never intercept interaction. Fixed so the gradient stays
              parked while the chat scrolls. */}
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-20 bg-aurora"
          />
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 -z-10 bg-noise mix-blend-overlay"
          />
          <ResponsiveGuard>{children}</ResponsiveGuard>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
