import { headers } from 'next/headers'

const MOBILE_UA_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i

export async function isMobile(): Promise<boolean> {
  const h = await headers()
  const ua = h.get('user-agent') ?? ''
  return MOBILE_UA_REGEX.test(ua)
}
