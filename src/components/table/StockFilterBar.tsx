import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterChip } from '@/components/ui/filter-chip'
import { InfoPopover } from '@/components/ui/info-popover'
import { Input } from '@/components/ui/input'
import {
  DEFAULT_FILTER,
  isFilterActive,
  LARGE_CAP_RANK,
  type FilterState,
  type PresetKey,
  type RangeKey,
} from '@/lib/stockFilter'
import { cn } from '@/lib/utils'

const MARKETS: { value: FilterState['market']; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'KOSPI', label: 'KOSPI' },
  { value: 'KOSDAQ', label: 'KOSDAQ' },
]

const PRESETS: { key: PresetKey; label: string; rule: string }[] = [
  { key: 'largeCap', label: '대형주', rule: `시가총액 순위 1~${LARGE_CAP_RANK}위` },
  { key: 'lowPer', label: '저PER', rule: 'PER이 0보다 크고 10 미만' },
  { key: 'highRoe', label: '고ROE', rule: 'ROE 10% 이상' },
  { key: 'highDividend', label: '고배당', rule: '배당률 5% 이상' },
]

/** 프리셋 칩 기준 — 칩 이름만으로는 어디서 끊는지 알 수 없다 */
function PresetHelp() {
  return (
    <InfoPopover title="칩 기준">
      <div className="flex flex-col gap-3 text-caption leading-relaxed text-foreground-secondary break-keep [text-wrap:pretty]">
        <dl className="flex flex-col gap-1">
          {PRESETS.map(({ key, label, rule }) => (
            <div key={key} className="flex gap-2">
              <dt className="w-12 shrink-0 font-medium text-foreground">{label}</dt>
              <dd>{rule}</dd>
            </div>
          ))}
        </dl>
        <p>
          대형주 순위는 KOSPI·KOSDAQ을 합친 전체 종목에서 매겨요. 저PER은 적자라 PER이 음수인
          종목을 빼요.
        </p>
        <p>칩을 여러 개 켜면 모두 만족하는 종목만 남고, 해당 값이 없는 종목은 빠져요.</p>
      </div>
    </InfoPopover>
  )
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'marketCap', label: '시총(억)' },
  { key: 'per', label: 'PER' },
  { key: 'pbr', label: 'PBR' },
  { key: 'roe', label: 'ROE' },
  { key: 'dividendYield', label: '배당률' },
]

interface StockFilterBarProps {
  value: FilterState
  onChange: (next: FilterState) => void
  matchCount: number
}

export function StockFilterBar({ value, onChange, matchCount }: StockFilterBarProps) {
  const [open, setOpen] = useState(false)
  // 입력 도중 문자열("3." 등)을 보존하려고 화면용 원문은 따로 든다 — 숫자만 상위로 올린다
  const [rangeText, setRangeText] = useState<Record<string, string>>({})

  const togglePreset = (key: PresetKey) => {
    const presets = new Set(value.presets)
    if (presets.has(key)) presets.delete(key)
    else presets.add(key)
    onChange({ ...value, presets })
  }

  const setRange = (key: RangeKey, bound: 'min' | 'max', raw: string) => {
    setRangeText((prev) => ({ ...prev, [`${key}.${bound}`]: raw }))
    const num = Number(raw)
    const parsed = raw.trim() !== '' && Number.isFinite(num) ? num : undefined
    onChange({
      ...value,
      ranges: { ...value.ranges, [key]: { ...value.ranges[key], [bound]: parsed } },
    })
  }

  const textOf = (key: RangeKey, bound: 'min' | 'max') => {
    const stored = value.ranges[key]?.[bound]
    return rangeText[`${key}.${bound}`] ?? (stored !== undefined ? String(stored) : '')
  }

  const reset = () => {
    setRangeText({})
    onChange({ ...DEFAULT_FILTER, presets: new Set(), ranges: {} })
  }

  return (
    <div className="card-surface mb-3 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {MARKETS.map(({ value: market, label }) => (
          <FilterChip
            key={market}
            active={value.market === market}
            onClick={() => onChange({ ...value, market })}
          >
            {label}
          </FilterChip>
        ))}

        <div className="h-4 w-px bg-border" />

        {PRESETS.map(({ key, label }) => (
          <FilterChip key={key} active={value.presets.has(key)} onClick={() => togglePreset(key)}>
            {label}
          </FilterChip>
        ))}
        <PresetHelp />

        <Button variant="ghost" size="sm" onClick={() => setOpen((prev) => !prev)}>
          상세 필터
          <ChevronDown
            data-icon="inline-end"
            className={cn('transition-transform', open && 'rotate-180')}
          />
        </Button>

        <span className="ml-auto text-caption text-muted-foreground">
          조건 일치 <span className="font-mono">{matchCount}</span>개
        </span>
        {isFilterActive(value) && (
          <Button variant="ghost" size="sm" onClick={reset}>
            초기화
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border pt-3">
          {RANGES.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-caption text-muted-foreground">{label}</span>
              <Input
                inputMode="numeric"
                placeholder="최소"
                className="h-8 w-20 font-mono text-caption"
                value={textOf(key, 'min')}
                onChange={(e) => setRange(key, 'min', e.target.value)}
              />
              <span className="text-caption text-foreground-tertiary">~</span>
              <Input
                inputMode="numeric"
                placeholder="최대"
                className="h-8 w-20 font-mono text-caption"
                value={textOf(key, 'max')}
                onChange={(e) => setRange(key, 'max', e.target.value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
