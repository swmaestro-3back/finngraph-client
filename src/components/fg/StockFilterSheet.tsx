import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useState, type RefObject } from 'react'
import { Button } from '@/components/fg/Button'
import { SideSheet } from '@/components/fg/SideSheet'
import type { StockRowRes, ThemeRes } from '@/lib/apiTypes'
import { filterStocks, themeTickerSet, type StockMarket, type ThemeFilter } from '@/lib/fg/stocks'
import { josa } from '@/lib/josa'
import { useKeyed } from '@/lib/queries/useKeyed'
import { fetchThemeStocks, fetchThemeTickers } from '@/lib/queries/useThemeStocks'
import { useThemesCached } from '@/lib/queries/useThemesCached'
import { NAME_QUERY_MAX, THEME_QUERY_MAX, type FilterState, type PresetKey, type RangeKey } from '@/lib/stockFilter'

type Range = { min?: number; max?: number }

export interface RangeFieldSpec {
  key: RangeKey
  label: string
  unit: string
  minOnly?: boolean
}

export const RANGE_FIELDS: readonly RangeFieldSpec[] = [
  { key: 'marketCap', label: '시가총액', unit: '억 원' },
  { key: 'per', label: 'PER', unit: '배' },
  { key: 'pbr', label: 'PBR', unit: '배' },
  { key: 'change', label: '등락률', unit: '%' },
  { key: 'roe', label: 'ROE', unit: '%', minOnly: true },
  { key: 'dividendYield', label: '배당수익률', unit: '%', minOnly: true },
]

function parseBound(raw: string): number | undefined {
  if (raw.trim() === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function RangeField({ field, value, onChange }: { field: RangeFieldSpec; value: Range; onChange: (next: Range) => void }) {
  const { label, unit, minOnly } = field
  return (
    <div className="fg-sfilter__field">
      <span className="fg-sfilter__label">
        {label} <span className="fg-sfilter__unit">{unit}</span>
      </span>
      <div className="fg-sfilter__range">
        <input
          type="number"
          inputMode="decimal"
          step="any"
          placeholder="최소"
          aria-label={`${label} 최소`}
          value={value.min ?? ''}
          onChange={(e) => onChange({ ...value, min: parseBound(e.target.value) })}
        />
        {!minOnly && (
          <>
            <span className="fg-sfilter__sep" aria-hidden="true">
              ~
            </span>
            <input
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="최대"
              aria-label={`${label} 최대`}
              value={value.max ?? ''}
              onChange={(e) => onChange({ ...value, max: parseBound(e.target.value) })}
            />
          </>
        )}
      </div>
    </div>
  )
}

function includesLabel(query: string): string {
  return `‘${query}’${josa(query, '이/가')} 들어간 테마 전체`
}

function ThemePicker({
  themes,
  pickedLabel,
  onPick,
  onPickQuery,
  onClear,
}: {
  themes: readonly ThemeRes[] | null
  pickedLabel: string | null
  onPick: (theme: ThemeRes) => void
  onPickQuery: (query: string) => void
  onClear: () => void
}) {
  const [query, setQuery] = useState('')
  const matched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q === '' || themes === null) return []
    return themes.filter((theme) => theme.name.toLowerCase().includes(q))
  }, [query, themes])
  const options = matched.slice(0, 8)
  const typed = query.trim()

  if (pickedLabel !== null) {
    return (
      <div className="fg-sfilter__picked">
        <span>{pickedLabel}</span>
        <button type="button" className="fg-iconbtn" aria-label="테마 선택 지우기" onClick={onClear}>
          <X size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>
      </div>
    )
  }
  return (
    <>
      <label className="fg-sfilter__search">
        <Search size={16} strokeWidth={1.75} aria-hidden="true" />
        <span className="fg-sr">테마 이름 검색</span>
        <input
          type="text"
          placeholder="테마 이름으로 찾아요"
          value={query}
          maxLength={THEME_QUERY_MAX}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      {typed !== '' && (
        <>
          {options.length === 0 ? (
            <p className="fg-sfilter__empty">'{typed}'에 맞는 테마가 없어요</p>
          ) : (
            <ul className="fg-sfilter__opts" role="listbox" aria-label="테마 검색 결과">
              {matched.length > 1 && (
                <li>
                  <button
                    type="button"
                    role="option"
                    className="fg-sfilter__all"
                    onClick={() => {
                      onPickQuery(typed)
                      setQuery('')
                    }}
                  >
                    {`${includesLabel(typed)} · ${matched.length}개`}
                  </button>
                </li>
              )}
              {options.map((theme) => (
                <li key={theme.id}>
                  <button
                    type="button"
                    role="option"
                    onClick={() => {
                      onPick(theme)
                      setQuery('')
                    }}
                  >
                    {theme.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}

interface StockFilterSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusRef: RefObject<HTMLElement | null>
  allRows: readonly StockRowRes[]
  market: StockMarket
  presets: readonly PresetKey[]
  favOnly: boolean
  isFavorite: (ticker: string) => boolean
  basisDate: string | null
  ranges: FilterState['ranges']
  themeId: number | null
  themeQ: string | null
  nameQ: string | null
  onApply: (ranges: FilterState['ranges'], theme: ThemeFilter, nameQ: string | null, rows: readonly StockRowRes[]) => void
}

export function StockFilterSheet({
  open,
  onOpenChange,
  returnFocusRef,
  allRows,
  market,
  presets,
  favOnly,
  isFavorite,
  basisDate,
  ranges,
  themeId,
  themeQ,
  nameQ,
  onApply,
}: StockFilterSheetProps) {
  const [draftRanges, setDraftRanges] = useState<FilterState['ranges']>(ranges)
  const [draftThemeId, setDraftThemeId] = useState<number | null>(themeId)
  const [draftThemeQ, setDraftThemeQ] = useState<string | null>(themeQ)
  const [draftThemeName, setDraftThemeName] = useState<string | null>(null)
  const [draftNameQ, setDraftNameQ] = useState(nameQ ?? '')

  useEffect(() => {
    if (!open) return
    setDraftRanges(ranges)
    setDraftThemeId(themeId)
    setDraftThemeQ(themeQ)
    setDraftNameQ(nameQ ?? '')
  }, [open, ranges, themeId, themeQ, nameQ])
  const nameQuery = draftNameQ.trim() === '' ? null : draftNameQ.trim()

  const themes = useThemesCached()
  const themeStocks = useKeyed(draftThemeId, fetchThemeStocks)
  const themeMatch = useKeyed(draftThemeId === null ? draftThemeQ : null, fetchThemeTickers)
  const themeTickers = useMemo(
    () => themeTickerSet(draftThemeId, themeStocks.data, themeMatch.data),
    [draftThemeId, themeStocks.data, themeMatch.data],
  )
  const themeLoading =
    draftThemeId !== null ? themeStocks.loading : draftThemeQ !== null && themeMatch.loading
  const pickedLabel =
    draftThemeId !== null
      ? (themes.data?.find((t) => t.id === draftThemeId)?.name ?? draftThemeName ?? '선택한 테마')
      : draftThemeQ !== null
        ? `${includesLabel(draftThemeQ)}${themeMatch.data ? ` · ${themeMatch.data.themes.length}개` : ''}`
        : null

  const previewRows = useMemo(
    () =>
      filterStocks(
        allRows,
        { market, presets, ranges: draftRanges, themeId: draftThemeId, themeQ: draftThemeQ, nameQ: nameQuery },
        favOnly,
        isFavorite,
        { basisDate, themeTickers },
      ),
    [allRows, market, presets, draftRanges, draftThemeId, draftThemeQ, nameQuery, favOnly, isFavorite, basisDate, themeTickers],
  )
  const previewCount = previewRows.length

  const setRange = (key: RangeKey, next: Range) => {
    setDraftRanges((prev) => {
      const clone = { ...prev }
      if (next.min === undefined && next.max === undefined) delete clone[key]
      else clone[key] = next
      return clone
    })
  }

  const resetDraft = () => {
    setDraftRanges({})
    setDraftThemeId(null)
    setDraftThemeQ(null)
    setDraftThemeName(null)
    setDraftNameQ('')
  }

  const apply = () => {
    onApply(draftRanges, { themeId: draftThemeId, themeQ: draftThemeQ }, nameQuery, previewRows)
    onOpenChange(false)
  }

  return (
    <SideSheet open={open} onOpenChange={onOpenChange} closeLabel="필터 닫기" returnFocusRef={returnFocusRef} title="필터">
      <div className="fg-sfilter">
        <div className="fg-sfilter__name">
          <span className="fg-sfilter__label">종목 이름</span>
          <label className="fg-sfilter__search">
            <Search size={16} strokeWidth={1.75} aria-hidden="true" />
            <span className="fg-sr">종목 이름이나 종목코드</span>
            <input
              type="text"
              placeholder="이름이나 종목코드가 들어간 종목"
              value={draftNameQ}
              maxLength={NAME_QUERY_MAX}
              onChange={(e) => setDraftNameQ(e.target.value)}
            />
          </label>
        </div>
        <div className="fg-sfilter__groups">
          {RANGE_FIELDS.map((field) => (
            <RangeField
              key={field.key}
              field={field}
              value={draftRanges[field.key] ?? {}}
              onChange={(next) => setRange(field.key, next)}
            />
          ))}
        </div>
        <div className="fg-sfilter__theme">
          <span className="fg-sfilter__label">테마</span>
          <ThemePicker
            themes={themes.data}
            pickedLabel={pickedLabel}
            onPick={(theme) => {
              setDraftThemeId(theme.id)
              setDraftThemeName(theme.name)
              setDraftThemeQ(null)
            }}
            onPickQuery={(query) => {
              setDraftThemeQ(query)
              setDraftThemeId(null)
              setDraftThemeName(null)
            }}
            onClear={() => {
              setDraftThemeId(null)
              setDraftThemeQ(null)
              setDraftThemeName(null)
            }}
          />
        </div>
        <p className="fg-sfilter__result" aria-live="polite">
          {themeLoading ? '테마 종목을 불러오는 중이에요' : `조건에 맞는 종목 ${previewCount.toLocaleString('ko-KR')}개`}
        </p>
        <div className="fg-sfilter__acts">
          <Button variant="tertiary" onClick={resetDraft}>
            초기화
          </Button>
          <Button variant="primary" onClick={apply} disabled={themeLoading} busy={themeLoading}>
            결과 {previewCount.toLocaleString('ko-KR')}개 보기
          </Button>
        </div>
      </div>
    </SideSheet>
  )
}
