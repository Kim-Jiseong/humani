export type InAppBrowserKind =
  | 'kakaotalk'
  | 'instagram'
  | 'facebook'
  | 'naver'
  | 'line'
  | null

export function detectInAppBrowser(
  userAgent: string | null | undefined,
): InAppBrowserKind {
  if (!userAgent) return null
  if (/KAKAOTALK/i.test(userAgent)) return 'kakaotalk'
  if (/Instagram/i.test(userAgent)) return 'instagram'
  if (/FBAN|FBAV|FB_IAB/i.test(userAgent)) return 'facebook'
  if (/NAVER\(inapp|; NAVER\(/i.test(userAgent)) return 'naver'
  if (/Line\//i.test(userAgent)) return 'line'
  return null
}

export function isAndroidUA(userAgent: string | null | undefined): boolean {
  return !!userAgent && /Android/i.test(userAgent)
}
