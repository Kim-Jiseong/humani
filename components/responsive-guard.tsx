// 개발 편의: 데스크톱에서도 접근 가능하도록 모바일 가드 비활성화.
// 활성화 방법:
//   1) 아래 두 import 주석 해제
//   2) 현재 ResponsiveGuard 정의 삭제
//   3) 파일 하단 주석 블록 안의 활성화 버전을 주석 해제

import { isMobile } from '@/lib/utils/is-mobile'
import { DesktopBlock } from './desktop-block'

// export function ResponsiveGuard({
//   children,
// }: {
//   children: React.ReactNode
// }) {
//   return <>{children}</>
// }

// ── 활성화 버전 ──────────────────────────────────────────────
export async function ResponsiveGuard({
  children,
}: {
  children: React.ReactNode
}) {
  const mobile = await isMobile()
  if (!mobile) return <DesktopBlock />
  return (
    <>
      <div className="md:hidden">{children}</div>
      <DesktopBlock className="hidden md:flex" />
    </>
  )
}
// ─────────────────────────────────────────────────────────────── 
