// Lucian UX/UI Prompt #305 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#305
import { useEffect, useState, type RefObject } from 'react'
import { Button } from '@/components/fg/Button'
import { LucianIcon } from '@/components/fg/LucianIcon'
import { SideSheet } from '@/components/fg/SideSheet'
import { RangeField } from '@/components/fg/StockFilterSheet'
import { THEME_NAME_MAX, THEME_RANGE_FIELDS, type ThemeRange, type ThemeRangeKey, type ThemeRanges } from '@/lib/fg/themeFilter'

interface ThemeFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusRef: RefObject<HTMLElement | null>
  ranges: ThemeRanges
  nameQ: string | null
  countOf: (ranges: ThemeRanges, nameQ: string | null) => number
  onApply: (ranges: ThemeRanges, nameQ: string | null) => void
}

export function ThemeFilterSheet({
  open,
  onOpenChange,
  returnFocusRef,
  ranges,
  nameQ,
  countOf,
  onApply,
}: ThemeFilterSheetProps) {
  const [draftRanges, setDraftRanges] = useState<ThemeRanges>(ranges)
  const [draftName, setDraftName] = useState(nameQ ?? '')

  useEffect(() => {
    if (!open) return
    setDraftRanges(ranges)
    setDraftName(nameQ ?? '')
  }, [open, ranges, nameQ])

  const nameQuery = draftName.trim() === '' ? null : draftName.trim()
  const count = countOf(draftRanges, nameQuery)

  const setRange = (key: ThemeRangeKey, next: ThemeRange) => {
    setDraftRanges((prev) => {
      const clone = { ...prev }
      if (next.min === undefined && next.max === undefined) delete clone[key]
      else clone[key] = next
      return clone
    })
  }

  const apply = () => {
    onApply(draftRanges, nameQuery)
    onOpenChange(false)
  }

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} closeLabel="필터 닫기" returnFocusRef={returnFocusRef} title="필터">
      <div className="fg-sfilter">
        <div className="fg-sfilter__name">
          <span className="fg-sfilter__label">테마 이름</span>
          <label className="fg-sfilter__search">
            <LucianIcon name="search" size={16} />
            <span className="fg-sr">테마 이름</span>
            <input
              type="text"
              placeholder="이름이 들어간 테마"
              value={draftName}
              maxLength={THEME_NAME_MAX}
              onChange={(e) => setDraftName(e.target.value)}
            />
          </label>
        </div>
        <div className="fg-sfilter__groups">
          {THEME_RANGE_FIELDS.map((field) => (
            <RangeField
              key={field.key}
              field={field}
              value={draftRanges[field.key] ?? {}}
              onChange={(next) => setRange(field.key, next)}
            />
          ))}
        </div>
        <p className="fg-sfilter__result" aria-live="polite">
          조건에 맞는 테마{' '}
          <b key={count} className="fg-roll fg-num">
            {count.toLocaleString('ko-KR')}
          </b>
          개
        </p>
        <div className="fg-sfilter__acts">
          <Button
            variant="tertiary"
            onClick={() => {
              setDraftRanges({})
              setDraftName('')
            }}
          >
            초기화
          </Button>
          <Button variant="primary" onClick={apply}>
            <span>
              결과{' '}
              <span key={count} className="fg-roll fg-num">
                {count.toLocaleString('ko-KR')}
              </span>
              개 보기
            </span>
          </Button>
        </div>
      </div>
    </SideSheet>
  )
}
