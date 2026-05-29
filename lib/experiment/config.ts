// Single source of truth for the experiment flow.
// Pure data + helpers — safe to import from both server and client components.

// ---------------------------------------------------------------------------
// Step state machine
// ---------------------------------------------------------------------------

export const STEP_ORDER = [
  'survey',
  'intro',
  'trial1_scenario',
  'trial1_chat',
  'trial1_survey',
  'trial2_scenario',
  'trial2_chat',
  'trial2_survey',
  'done',
] as const

export type Step = (typeof STEP_ORDER)[number]

export const STEP_ROUTE: Record<Step, string> = {
  survey: '/survey',
  intro: '/intro',
  trial1_scenario: '/trial/1/scenario',
  trial1_chat: '/trial/1/chat',
  trial1_survey: '/trial/1/survey',
  trial2_scenario: '/trial/2/scenario',
  trial2_chat: '/trial/2/chat',
  trial2_survey: '/trial/2/survey',
  done: '/done',
}

export function isStep(value: string): value is Step {
  return (STEP_ORDER as readonly string[]).includes(value)
}

export function stepIndex(step: Step): number {
  return STEP_ORDER.indexOf(step)
}

/** Next step in the linear flow. `done` is terminal (returns itself). */
export function nextStep(step: Step): Step {
  const i = stepIndex(step)
  return STEP_ORDER[Math.min(i + 1, STEP_ORDER.length - 1)]
}

// ---------------------------------------------------------------------------
// Trials
// ---------------------------------------------------------------------------

export type GroupType = 1 | 2 | 3 | 4
export type TrialIndex = 1 | 2
export type TrialPhase = 'scenario' | 'chat' | 'survey'
export type ScenarioKey = 'A' | 'B'
export type Condition = 'baseline' | 'related'

/** The six non-terminal trial steps (everything except survey/intro/done). */
export type TrialStep = `trial${TrialIndex}_${TrialPhase}`

export type TrialPlan = { scenario: ScenarioKey; condition: Condition }

/** group_type → per-trial (scenario, condition). Matches the study design table. */
export const GROUP_PLAN: Record<GroupType, Record<TrialIndex, TrialPlan>> = {
  1: { 1: { scenario: 'A', condition: 'baseline' }, 2: { scenario: 'B', condition: 'related' } },
  2: { 1: { scenario: 'A', condition: 'related' }, 2: { scenario: 'B', condition: 'baseline' } },
  3: { 1: { scenario: 'B', condition: 'baseline' }, 2: { scenario: 'A', condition: 'related' } },
  4: { 1: { scenario: 'B', condition: 'related' }, 2: { scenario: 'A', condition: 'baseline' } },
}

export function planFor(groupType: GroupType, trialIndex: TrialIndex): TrialPlan {
  return GROUP_PLAN[groupType][trialIndex]
}

export function trialStep(phase: TrialPhase, n: TrialIndex): TrialStep {
  return `trial${n}_${phase}`
}

/** Parse the `[n]` dynamic segment; returns null for anything but "1"/"2". */
export function parseTrialIndex(value: string): TrialIndex | null {
  if (value === '1') return 1
  if (value === '2') return 2
  return null
}

// ---------------------------------------------------------------------------
// Scenario copy (verbatim from the study brief — do not paraphrase)
// ---------------------------------------------------------------------------

export type ScenarioContent = {
  title: string
  topic: string
  output: string
  body: string
  note: string
}

export const SCENARIO_TEXT: Record<ScenarioKey, ScenarioContent> = {
  A: {
    title: '10분 자기소개 발표자료 생성',
    topic: '면접에서의 10분 자기소개',
    output: '자기소개 프레젠테이션 슬라이드',
    body: '당신은 오늘 서류 합격 통보와 함께, 내일 있을 면접에서 10분 간 자기소개를 해야 한다는 안내를 받았습니다. 자기소개의 내용은 자유롭게 구성하면 되며, 발표자료가 필요하다고 합니다. 자기소개를 준비할 시간이 많지 않은데 10분 분량을 채워야 해서, 생성형 AI(ex. ChatGPT, Gemini, Claude 등)에게 발표자료 초안 생성을 요청하려고 합니다.',
    note: '상황, 목차, 디자인 스타일 등을 포함하여 구체적으로 생성해야 합니다.',
  },
  B: {
    title: '최근 여행 후기 블로그 생성',
    topic: '최근 여행 후기 블로그',
    output: '여행 후기 블로그 초안',
    body: '당신은 최근에 다녀온 여행에 대한 기억이 사라지기 전에, 오늘은 꼭 여행 후기 블로그를 포스팅하려고 합니다. 블로그의 내용은 자유롭게 구성하면 되며, 글과 표 등을 문서에 먼저 작성 후 블로그 포스팅을 하며 사진을 추가하려고 합니다. 블로그에 쓸 내용을 직접 정리하기에는 다른 일정으로 바빠 시간이 없어서, 생성형 AI(ex. ChatGPT, Gemini, Claude 등)에게 블로그 초안 생성을 요청하려고 합니다.',
    note: '여행 목적, 여행 일정, 문서 레이아웃 등을 포함하여 구체적으로 생성해야 합니다.',
  },
}

// ---------------------------------------------------------------------------
// Survey field options + labels
// ---------------------------------------------------------------------------

export type Gender = 'male' | 'female'
export type LlmFrequency = 'low' | 'mid' | 'high'

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: '남' },
  { value: 'female', label: '여' },
]

export const LLM_FREQUENCY_OPTIONS: { value: LlmFrequency; label: string }[] = [
  { value: 'low', label: '주 1회 이하' },
  { value: 'mid', label: '주 2–3회' },
  { value: 'high', label: '주 4회 이상' },
]

export const CONDITION_LABEL: Record<Condition, string> = {
  baseline: '기존 조건',
  related: '연관 조건으로 분류됨',
}
