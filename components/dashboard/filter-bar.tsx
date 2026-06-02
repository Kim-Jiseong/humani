'use client'

import { Filter, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Segmented } from './primitives'
import type { FilterValues } from '@/lib/dashboard/aggregate'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {children}
    </div>
  )
}

export function FilterBar({
  values,
  onChange,
  onReset,
  activeCount,
}: {
  values: FilterValues
  onChange: (patch: Partial<FilterValues>) => void
  onReset: () => void
  activeCount: number
}) {
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-foreground/10 sm:p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Filter className="size-4 text-muted-foreground" />
          필터
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="xs" onClick={onReset}>
            <X className="size-3" />
            초기화
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <Field label="참가 기간">
          <Segmented
            value={values.period}
            onChange={v => onChange({ period: v })}
            options={[
              { value: 'all', label: '전체' },
              { value: '7d', label: '최근 7일' },
              { value: '30d', label: '최근 30일' },
              { value: 'custom', label: '직접 지정' },
            ]}
          />
        </Field>

        {values.period === 'custom' && (
          <Field label="기간 범위">
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={values.from}
                onChange={e => onChange({ from: e.target.value })}
                className="h-7 w-[9.5rem] text-xs"
              />
              <span className="text-xs text-muted-foreground">~</span>
              <Input
                type="date"
                value={values.to}
                onChange={e => onChange({ to: e.target.value })}
                className="h-7 w-[9.5rem] text-xs"
              />
            </div>
          </Field>
        )}

        <Field label="조건">
          <Segmented
            value={values.condition}
            onChange={v => onChange({ condition: v })}
            options={[
              { value: 'all', label: '전체' },
              { value: 'baseline', label: 'baseline' },
              { value: 'related', label: 'related' },
            ]}
          />
        </Field>

        <Field label="시나리오">
          <Segmented
            value={values.scenario}
            onChange={v => onChange({ scenario: v })}
            options={[
              { value: 'all', label: '전체' },
              { value: 'A', label: 'A' },
              { value: 'B', label: 'B' },
            ]}
          />
        </Field>

        <Field label="진행 상태">
          <Segmented
            value={values.status}
            onChange={v => onChange({ status: v })}
            options={[
              { value: 'all', label: '전체' },
              { value: 'completed', label: '완료' },
              { value: 'in_progress', label: '진행중' },
            ]}
          />
        </Field>
      </div>
    </div>
  )
}
