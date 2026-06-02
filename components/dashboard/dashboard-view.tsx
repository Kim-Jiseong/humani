'use client'

import { useMemo, useState } from 'react'
import {
  Activity,
  ChevronRight,
  ClipboardList,
  Clock,
  LayoutDashboard,
  Sigma,
  Sparkles,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatInt, formatMs, formatNum } from '@/lib/dashboard/format'
import {
  applyFilters,
  buildUserDetail,
  countActiveFilters,
  DEFAULT_FILTERS,
  resolveFilter,
  summarize,
  type CountItem,
  type FilterValues,
  type GroupAgg,
  type UserTrialRow,
} from '@/lib/dashboard/aggregate'
import type { DashboardData } from '@/lib/db/dashboard'
import { GroupedBarChart, CountBarChart } from '@/components/dashboard/charts'
import { Badge, Section, StatCard } from '@/components/dashboard/primitives'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { RefreshButton } from '@/components/dashboard/refresh-button'
import { UserDetailSheet } from '@/components/dashboard/user-detail-sheet'

// ---------------------------------------------------------------------------
// Reusable table cells
// ---------------------------------------------------------------------------

const TH = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <th className={cn('px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground', className)}>
    {children}
  </th>
)
const TD = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <td className={cn('px-3 py-2 whitespace-nowrap tabular-nums', className)}>{children}</td>
)

// ---------------------------------------------------------------------------
// Grouped pause aggregate block (condition / scenario / trial-order)
// ---------------------------------------------------------------------------

function GroupAggBlock({ groups }: { groups: GroupAgg[] }) {
  const chartData = groups.map(g => ({
    label: g.label,
    평균: g.events.avgMs,
    중앙: g.events.medianMs,
  }))

  return (
    <div className="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <GroupedBarChart
        data={chartData}
        series={[
          { key: '평균', name: '평균 중지시간', color: '#6366f1' },
          { key: '중앙', name: '중앙 중지시간', color: '#06b6d4' },
        ]}
        valueFormatter={formatMs}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <TH>그룹</TH>
              <TH className="text-right">유저 수</TH>
              <TH className="text-right">중지 수</TH>
              <TH className="text-right">평균</TH>
              <TH className="text-right">중앙</TH>
              <TH className="text-right">최소</TH>
              <TH className="text-right">최대</TH>
              <TH className="text-right">총합</TH>
              <TH className="text-right">유저당 평균 횟수</TH>
              <TH className="text-right">유저당 평균 시간</TH>
            </tr>
          </thead>
          <tbody>
            {groups.map(g => (
              <tr key={g.key} className="border-b last:border-0">
                <TD className="font-medium">{g.label}</TD>
                <TD className="text-right">{g.nUsers}</TD>
                <TD className="text-right">{formatInt(g.events.count)}</TD>
                <TD className="text-right">{formatMs(g.events.avgMs)}</TD>
                <TD className="text-right">{formatMs(g.events.medianMs)}</TD>
                <TD className="text-right">{formatMs(g.events.minMs)}</TD>
                <TD className="text-right">{formatMs(g.events.maxMs)}</TD>
                <TD className="text-right">{formatMs(g.events.sumMs)}</TD>
                <TD className="text-right">{formatNum(g.perUserCount.mean)}</TD>
                <TD className="text-right">{formatMs(g.perUserSumMs.mean)}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Per-user × trial detail table (sortable + clickable rows)
// ---------------------------------------------------------------------------

type SortKey = 'seq' | 'count' | 'avg' | 'sum'

function SortTH({
  label,
  k,
  active,
  desc,
  onSort,
  className,
}: {
  label: string
  k: SortKey
  active: boolean
  desc: boolean
  onSort: (k: SortKey) => void
  className?: string
}) {
  return (
    <th
      className={cn(
        'cursor-pointer px-3 py-2 text-right font-medium whitespace-nowrap text-muted-foreground select-none hover:text-foreground',
        active && 'text-foreground',
        className,
      )}
      onClick={() => onSort(k)}
    >
      {label}
      {active ? (desc ? ' ↓' : ' ↑') : ''}
    </th>
  )
}

function PauseTable({
  rows,
  onSelect,
}: {
  rows: UserTrialRow[]
  onSelect: (userId: string) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>('seq')
  const [desc, setDesc] = useState(false)

  const sorted = useMemo(() => {
    const val = (r: UserTrialRow) =>
      sortKey === 'seq'
        ? r.seq * 10 + r.trialIndex
        : sortKey === 'count'
          ? r.pause.count
          : sortKey === 'avg'
            ? r.pause.avgMs
            : r.pause.sumMs
    return [...rows].sort((a, b) => (val(a) - val(b)) * (desc ? -1 : 1))
  }, [rows, sortKey, desc])

  const toggle = (k: SortKey) => {
    if (k === sortKey) setDesc(d => !d)
    else {
      setSortKey(k)
      setDesc(k !== 'seq')
    }
  }

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
        조건에 맞는 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
      <table className="w-full min-w-[60rem] border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <SortTH label="참가자" k="seq" active={sortKey === 'seq'} desc={desc} onSort={toggle} className="text-left" />
            <TH className="text-right">그룹</TH>
            <TH className="text-center">나이/성별/빈도</TH>
            <TH className="text-center">Trial</TH>
            <TH className="text-center">시나리오</TH>
            <TH className="text-center">조건</TH>
            <SortTH label="중지 수" k="count" active={sortKey === 'count'} desc={desc} onSort={toggle} />
            <SortTH label="평균" k="avg" active={sortKey === 'avg'} desc={desc} onSort={toggle} />
            <SortTH label="총합" k="sum" active={sortKey === 'sum'} desc={desc} onSort={toggle} />
            <TH className="text-right">정신/노력/수행/좌절</TH>
            <TH />
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr
              key={`${r.userId}:${r.trialIndex}`}
              className="group cursor-pointer border-b last:border-0 hover:bg-muted/40"
              onClick={() => onSelect(r.userId)}
            >
              <TD className="text-left">
                <span className="font-medium">#{r.seq}</span>{' '}
                <span className="text-xs text-muted-foreground">{r.userShort}</span>
                {!r.completed && <span className="ml-1 text-xs text-amber-600">진행중</span>}
              </TD>
              <TD className="text-right">{r.groupType}</TD>
              <TD className="text-center text-xs text-muted-foreground">
                {r.age} / {r.gender === 'male' ? '남' : '여'} / {r.llmFrequency}
              </TD>
              <TD className="text-center">{r.trialIndex}</TD>
              <TD className="text-center">
                <Badge tone={r.scenario}>{r.scenario}</Badge>
              </TD>
              <TD className="text-center">
                <Badge tone={r.condition}>{r.condition}</Badge>
              </TD>
              <TD className="text-right font-medium">{formatInt(r.pause.count)}</TD>
              <TD className="text-right">{formatMs(r.pause.avgMs)}</TD>
              <TD className="text-right">{formatMs(r.pause.sumMs)}</TD>
              <TD className="text-right text-xs">
                {r.survey
                  ? `${r.survey.mental_demand ?? '–'}/${r.survey.effort ?? '–'}/${r.survey.performance ?? '–'}/${r.survey.frustration ?? '–'}`
                  : '–'}
              </TD>
              <TD className="text-right">
                <ChevronRight className="size-4 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
              </TD>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CountCard({
  title,
  items,
  horizontal,
}: {
  title: string
  items: CountItem[]
  horizontal?: boolean
}) {
  return (
    <div className="space-y-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="text-sm font-medium">{title}</div>
      <CountBarChart
        data={items.map(i => ({ label: i.label, count: i.count }))}
        horizontal={horizontal}
        height={horizontal ? Math.max(120, items.length * 34) : 190}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------

type TabKey = 'overview' | 'pauses' | 'participants' | 'survey' | 'suggestions'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'overview', label: '개요', icon: <LayoutDashboard className="size-4" /> },
  { key: 'pauses', label: '중지 분석', icon: <Activity className="size-4" /> },
  { key: 'participants', label: '참가자', icon: <Users className="size-4" /> },
  { key: 'survey', label: '설문', icon: <ClipboardList className="size-4" /> },
  { key: 'suggestions', label: '단어 추천', icon: <Sparkles className="size-4" /> },
]

// ---------------------------------------------------------------------------
// Top-level view
// ---------------------------------------------------------------------------

export function DashboardView({
  data,
  generatedAt,
}: {
  data: DashboardData
  generatedAt: string
}) {
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS)
  const [tab, setTab] = useState<TabKey>('overview')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  // "Now" for relative-period filters = the server fetch time (updates on
  // refresh). Pure: derived from the generatedAt prop, not a live clock.
  const nowMs = useMemo(() => new Date(generatedAt).getTime(), [generatedAt])
  const summary = useMemo(
    () => summarize(applyFilters(data, resolveFilter(filters, nowMs))),
    [data, filters, nowMs],
  )
  const detail = useMemo(
    () => (selectedUserId ? buildUserDetail(data, selectedUserId) : null),
    [data, selectedUserId],
  )
  const activeCount = countActiveFilters(filters)

  const { overview, byCondition, byScenario, byTrialIndex, rows, demographics, survey, suggestions } =
    summary

  const updatedLabel = useMemo(
    () => new Date(generatedAt).toLocaleString('ko-KR', { hour12: false }),
    [generatedAt],
  )

  return (
    <div className="pb-12">
      {/* Sticky header + tabs */}
      <div className="sticky top-0 z-20 -mx-4 mb-5 border-b border-border/60 bg-background/85 px-4 pt-4 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              실험 데이터 대시보드
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="size-3" />
              마지막 갱신 {updatedLabel}
            </p>
          </div>
          <RefreshButton />
        </div>

        <nav className="mt-3 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
                tab === t.key
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-5">
        <FilterBar
          values={filters}
          onChange={patch => setFilters(f => ({ ...f, ...patch }))}
          onReset={() => setFilters(DEFAULT_FILTERS)}
          activeCount={activeCount}
        />

        {overview.participants === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            {activeCount > 0
              ? '필터 조건에 맞는 데이터가 없습니다.'
              : '아직 수집된 데이터가 없습니다.'}
          </div>
        ) : (
          <div className="space-y-10">
            {/* ---------------- 개요 ---------------- */}
            {tab === 'overview' && (
              <>
                <Section title="개요" icon={<LayoutDashboard className="size-4" />}>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                    <StatCard label="참가자" value={formatInt(overview.participants)} hint={`완료 ${overview.completed}명`} icon={<Users className="size-4" />} accent="indigo" />
                    <StatCard label="제출 Trial" value={formatInt(overview.trialsSubmitted)} icon={<ClipboardList className="size-4" />} accent="cyan" />
                    <StatCard label="총 중지 수" value={formatInt(overview.pauseEvents)} icon={<Activity className="size-4" />} accent="emerald" />
                    <StatCard label="이벤트 평균 중지시간" value={formatMs(overview.allEvents.avgMs)} hint={`중앙 ${formatMs(overview.allEvents.medianMs)}`} icon={<Timer className="size-4" />} accent="amber" />
                    <StatCard label="총 중지시간" value={formatMs(overview.allEvents.sumMs)} icon={<Sigma className="size-4" />} accent="pink" />
                  </div>
                </Section>

                <Section
                  title="전체 유저 기준 중지 통계"
                  icon={<TrendingUp className="size-4" />}
                  description={`유저별 합계를 모아 계산 (중지 데이터가 있는 유저 ${overview.nUsersWithPauses}명 기준)`}
                >
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                    <StatCard label="유저당 중지 횟수 · 평균" value={formatNum(overview.perUserCount.mean)} accent="indigo" />
                    <StatCard label="유저당 중지 횟수 · 중앙" value={formatNum(overview.perUserCount.median)} accent="indigo" />
                    <StatCard label="유저당 중지 횟수 · 총합" value={formatInt(overview.perUserCount.sum)} accent="indigo" />
                    <StatCard label="유저당 중지 시간 · 평균" value={formatMs(overview.perUserSumMs.mean)} accent="emerald" />
                    <StatCard label="유저당 중지 시간 · 중앙" value={formatMs(overview.perUserSumMs.median)} accent="emerald" />
                    <StatCard label="유저당 중지 시간 · 총합" value={formatMs(overview.perUserSumMs.sum)} accent="emerald" />
                  </div>
                </Section>

                <Section
                  title="조건 비교 · baseline vs related"
                  icon={<Activity className="size-4" />}
                  description="워드클라우드(단어 추천) 표시 여부에 따른 중지 비교 — 이 실험의 핵심 대비"
                >
                  <GroupAggBlock groups={byCondition} />
                </Section>
              </>
            )}

            {/* ---------------- 중지 분석 ---------------- */}
            {tab === 'pauses' && (
              <>
                <Section title="조건 비교 · baseline vs related" icon={<Activity className="size-4" />} description="워드클라우드 표시 여부에 따른 중지">
                  <GroupAggBlock groups={byCondition} />
                </Section>
                <Section title="시나리오 비교 · A vs B" description="A: 자기소개 발표자료 / B: 여행 후기 블로그">
                  <GroupAggBlock groups={byScenario} />
                </Section>
                <Section title="Trial 순서 비교 · 1 vs 2" description="순서(학습/피로) 효과 점검">
                  <GroupAggBlock groups={byTrialIndex} />
                </Section>
              </>
            )}

            {/* ---------------- 참가자 ---------------- */}
            {tab === 'participants' && (
              <>
                <Section
                  title="유저 × Trial 상세"
                  icon={<Users className="size-4" />}
                  description="행을 클릭하면 중지 이벤트·설문까지 세부 내역이 열립니다. 헤더의 중지 수/평균/총합으로 정렬할 수 있습니다."
                >
                  <PauseTable rows={rows} onSelect={setSelectedUserId} />
                </Section>
                <Section title="참가자 인구통계">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <CountCard title="성별" items={demographics.gender} />
                    <CountCard title="연령대" items={demographics.age} />
                    <CountCard title="LLM 사용 빈도" items={demographics.llmFrequency} />
                    <CountCard title="그룹 배정" items={demographics.group} />
                  </div>
                </Section>
              </>
            )}

            {/* ---------------- 설문 ---------------- */}
            {tab === 'survey' && (
              <Section title="설문 · NASA-TLX" icon={<ClipboardList className="size-4" />} description={`총 ${survey.nResponses}건 응답`}>
                <div className="space-y-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                  <div className="text-sm font-medium">조건별 NASA-TLX 평균 (0–100)</div>
                  <GroupedBarChart
                    data={survey.tlx.map(t => ({
                      label: t.title,
                      baseline: t.baseline,
                      related: t.related,
                    }))}
                    series={[
                      { key: 'baseline', name: 'baseline', color: '#64748b' },
                      { key: 'related', name: 'related', color: '#6366f1' },
                    ]}
                    valueFormatter={v => formatNum(v)}
                  />
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <CountCard title="단어 인지 (related 조건)" items={survey.wordRecognition} horizontal />
                  <CountCard title="단어 영향 (related 조건)" items={survey.wordInfluence} horizontal />
                </div>
              </Section>
            )}

            {/* ---------------- 추천 ---------------- */}
            {tab === 'suggestions' && (
              <Section title="단어 추천 로그" icon={<Sparkles className="size-4" />} description={`총 ${suggestions.total}건 제시`}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                    <div className="text-sm font-medium">유저별 추천 제시 횟수</div>
                    <CountBarChart
                      data={suggestions.perUser.map(u => ({ label: `#${u.seq}`, count: u.count }))}
                      height={200}
                    />
                  </div>
                  <CountCard title="자주 쓰인 쿼리 단어 (상위 15)" items={suggestions.topWords} horizontal />
                </div>
              </Section>
            )}
          </div>
        )}
      </div>

      <UserDetailSheet
        detail={detail}
        open={selectedUserId != null}
        onOpenChange={open => {
          if (!open) setSelectedUserId(null)
        }}
      />
    </div>
  )
}
