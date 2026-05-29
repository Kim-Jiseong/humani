import { Clock, Smartphone, TriangleAlert, RotateCcw } from 'lucide-react'
import { requireStep } from '@/lib/experiment/guard'
import { ExperimentShell } from '@/components/experiment/experiment-shell'
import { AdvanceButton } from '@/components/experiment/advance-button'
import { BrandOrb } from '@/components/brand-orb'

const NOTES = [
  { icon: Clock, text: '약 5분 정도 소요됩니다.' },
  { icon: TriangleAlert, text: '실험은 한 번만 참여할 수 있습니다.' },
  { icon: RotateCcw, text: '중간에 나가면 재참여가 어렵습니다.' },
  { icon: Smartphone, text: '모바일 환경에서 진행해 주세요.' },
]

export default async function IntroPage() {
  await requireStep('intro')

  return (
    <ExperimentShell>
      <div className="flex flex-1 flex-col justify-center gap-8 py-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandOrb size="lg" />
          <h1 className="text-2xl font-semibold tracking-tight">실험 안내</h1>
        </div>

        <ul className="glass flex flex-col gap-4 rounded-2xl px-5 py-5">
          {NOTES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <span className="bg-brand-gradient flex size-8 shrink-0 items-center justify-center rounded-full text-white">
                <Icon className="size-4" />
              </span>
              <span className="text-[15px] leading-snug">{text}</span>
            </li>
          ))}
        </ul>

        <AdvanceButton step="intro" label="시작하기" />
      </div>
    </ExperimentShell>
  )
}
