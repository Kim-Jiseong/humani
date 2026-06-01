// Post-trial survey definitions (NASA-TLX + condition-specific items).
// Pure data + validation — safe to import from server and client.

import type { TrialIndex } from './config'

// ---------------------------------------------------------------------------
// NASA-TLX (all conditions) — 0..100 in steps of 5
// ---------------------------------------------------------------------------

export const TLX_MIN = 0
export const TLX_MAX = 100
export const TLX_STEP = 5

export type TlxKey =
  | 'mental_demand'
  | 'physical_demand'
  | 'temporal_demand'
  | 'effort'
  | 'performance'
  | 'frustration'

export type TlxItem = {
  key: TlxKey
  title: string
  description: string
  lowLabel: string
  highLabel: string
}

export const TLX_ITEMS: TlxItem[] = [
  {
    key: 'mental_demand',
    title: '정신적 요구',
    description:
      '얼마나 많은 정신적 및 지각적 활동(예: 생각하기, 결정하기, 계산하기, 기억하기, 바라보기, 탐색하기 등)이 필요했습니까? 과제는 쉬웠습니까, 어려웠습니까? 단순했습니까, 복잡했습니까? 까다로웠습니까, 실수에 관대했습니까?',
    lowLabel: '낮음',
    highLabel: '높음',
  },
  {
    key: 'physical_demand',
    title: '신체적 요구',
    description:
      '얼마나 많은 신체적 활동(예: 밀기, 당기기, 돌리기, 제어하기, 활성화하기 등)이 필요했습니까? 과제는 쉬웠습니까, 많은 것을 요구했습니까? 느렸습니까, 빨랐습니까? 느슨했습니까, 아주 힘들었습니까? 편안했습니까, 고단했습니까?',
    lowLabel: '낮음',
    highLabel: '높음',
  },
  {
    key: 'temporal_demand',
    title: '시간적 요구',
    description:
      '과제 또는 과제 요소가 발생하는 속도 때문에 얼마나 시간적 압박을 느꼈습니까? 속도는 느리고 여유로웠습니까, 빠르고 정신없었습니까?',
    lowLabel: '낮음',
    highLabel: '높음',
  },
  {
    key: 'effort',
    title: '노력',
    description:
      '수행 수준을 달성하기 위해 정신적으로나 육체적으로 얼마나 열심히 노력해야 했습니까?',
    lowLabel: '낮음',
    highLabel: '높음',
  },
  {
    key: 'performance',
    title: '수행',
    description:
      '실험자(또는 본인)가 설정한 과제의 목표를 달성하는 데 얼마나 성공적이었다고 생각하십니까? 이러한 목표를 달성하는 데 있어 본인의 성과에 얼마나 만족하셨습니까?',
    lowLabel: '형편없음',
    highLabel: '훌륭함',
  },
  {
    key: 'frustration',
    title: '좌절감 수준',
    description:
      '과업을 수행하는 동안 얼마나 불안하고, 낙담하고, 짜증 나고, 스트레스 받고, 성가셨습니까? 아니면 얼마나 안심되고, 뿌듯하고, 만족스럽고, 편안하고, 느긋했습니까?',
    lowLabel: '낮음',
    highLabel: '높음',
  },
]

// ---------------------------------------------------------------------------
// Condition-specific items — only shown/required when condition === 'related'
// ---------------------------------------------------------------------------

export type WordRecognition =
  | 'not_gazed'
  | 'visual_only'
  | 'meaning_sometimes'
  | 'meaning_always'

export type WordInfluence =
  | 'never_recognized'
  | 'unrelated'
  | 'used_as_is'
  | 'used_associated'

export const WORD_RECOGNITION_OPTIONS: {
  value: WordRecognition
  label: string
}[] = [
  { value: 'not_gazed', label: '입력창 상단을 응시하지 않음' },
  {
    value: 'visual_only',
    label:
      '입력창 상단을 응시했으나, 시각적 변화만 인지하고 단어의 의미를 인지하지 못함',
  },
  {
    value: 'meaning_sometimes',
    label: '입력창 상단을 응시하고, 때때로 단어의 의미를 인지함',
  },
  {
    value: 'meaning_always',
    label: '입력창 상단을 응시하고, 매번 단어의 의미를 인지함',
  },
]

export const WORD_INFLUENCE_OPTIONS: { value: WordInfluence; label: string }[] =
  [
    { value: 'never_recognized', label: '단어의 의미를 인지한 적 없음' },
    { value: 'unrelated', label: '인지한 단어와 무관하게 이후 문장을 작성함' },
    { value: 'used_as_is', label: '인지한 단어를 그대로 활용해 이후 문장을 작성함' },
    {
      value: 'used_associated',
      label: '인지한 단어를 보고 떠오른 단어를 활용해 이후 문장을 작성함',
    },
  ]

export const RELATED_QUESTIONS = [
  {
    key: 'word_recognition' as const,
    title:
      '프롬프트(채팅) 작성 중 입력창 상단에 제시된 단어를 인지했습니까?',
    options: WORD_RECOGNITION_OPTIONS,
  },
  {
    key: 'word_influence' as const,
    title:
      '제시된 단어를 인지했을 때, 그 단어가 이후 문장 작성에 어떤 영향을 주었습니까?',
    options: WORD_INFLUENCE_OPTIONS,
  },
]

// ---------------------------------------------------------------------------
// Answer shape + validation
// ---------------------------------------------------------------------------

export type TrialSurveyAnswers = Record<TlxKey, number> & {
  word_recognition?: WordRecognition
  word_influence?: WordInfluence
}

function isValidTlxValue(v: unknown): v is number {
  return (
    typeof v === 'number' &&
    Number.isInteger(v) &&
    v >= TLX_MIN &&
    v <= TLX_MAX &&
    v % TLX_STEP === 0
  )
}

/**
 * Validate + whitelist survey answers. Returns a clean object to persist, or
 * null if anything required is missing/invalid. When `isRelated`, the two
 * condition-specific items are required; otherwise they are dropped.
 */
export function sanitizeSurveyAnswers(
  raw: unknown,
  isRelated: boolean,
): TrialSurveyAnswers | null {
  if (typeof raw !== 'object' || raw === null) return null
  const input = raw as Record<string, unknown>

  const clean = {} as TrialSurveyAnswers
  for (const item of TLX_ITEMS) {
    const v = input[item.key]
    if (!isValidTlxValue(v)) return null
    clean[item.key] = v
  }

  if (isRelated) {
    const rec = input.word_recognition
    const inf = input.word_influence
    if (!WORD_RECOGNITION_OPTIONS.some(o => o.value === rec)) return null
    if (!WORD_INFLUENCE_OPTIONS.some(o => o.value === inf)) return null
    clean.word_recognition = rec as WordRecognition
    clean.word_influence = inf as WordInfluence
  }

  return clean
}

export function trialOrdinalLabel(trialIndex: TrialIndex): string {
  return trialIndex === 1 ? '첫 번째' : '두 번째'
}
