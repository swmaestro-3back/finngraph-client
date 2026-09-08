import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterChip } from '@/components/ui/filter-chip'
import { Input } from '@/components/ui/input'
import type { StockRowRes } from '@/lib/apiTypes'
import {
  DEFAULT_FILTER,
  isFilterActive,
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

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'lowPer', label: '저PER' },
  { key: 'highDividend', label: '고배당' },
  { key: 'highRoe', label: '고ROE' },
  { key: 'largeCap', label: '대형주' },
]

const RANGES: { key: RangeKey; label: string }[] = [
  { key: 'marketCap', label: '시총(억)' },
  { key: 'per', label: 'PER' },
  { key: 'pbr', label: 'PBR' },
  { key: 'roe', label: 'ROE' },
  { key: 'dividendYield', label: '배당률' },
]

interface StockFilterBarProps {
  stocks: StockRowRes[]
  value: FilterState
  onChange: (next: FilterState) => void
  matchCount: number
}

export function StockFilterBar({ stocks, value, onChange, matchCount }: StockFilterBarProps) {
  const [open, setOpen] = useState(false)
  // 입력 도중 문자열("3." 등)을 보존하려고 화면용 원문은 따로 든다 — 숫자만 상위로 올린다
  const [rangeText, setRangeText] = useState<Record<string, string>>({})

  const themes = useMemo(() => {
    const set = new Set<string>()
    for (const stock of stocks) if (stock.themeName) set.add(stock.themeName)
    return [...set].sort((a, b) => a.localeCompare(b, 'ko'))
  }, [stocks])

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

        <select
          value={value.theme ?? ''}
          onChange={(e) => onChange({ ...value, theme: e.target.value || null })}
          className="h-[30px] cursor-pointer rounded border border-border bg-transparent px-2 text-caption font-medium text-foreground-secondary outline-none focus-visible:border-ring"
        >
          <option value="">전체 테마</option>
          {themes.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>

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
