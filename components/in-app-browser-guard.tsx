import { headers } from 'next/headers'
import { detectInAppBrowser, isAndroidUA } from '@/lib/is-in-app-browser'
import { InAppBrowserBlock } from './in-app-browser-block'

export async function InAppBrowserGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const ua = (await headers()).get('user-agent')
  const kind = detectInAppBrowser(ua)
  if (!kind) return <>{children}</>
  return <InAppBrowserBlock kind={kind} isAndroid={isAndroidUA(ua)} />
}
