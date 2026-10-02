import type { StockRowRes } from '@/lib/apiTypes'

export type PresetKey = 'lowPer' | 'highDividend' | 'highRoe' | 'largeCap'
export type RangeKey = 'marketCap' | 'per' | 'pbr' | 'roe' | 'dividendYield'

export interface FilterState {
  market: 'ALL' | 'KOSPI' | 'KOSDAQ'
  presets: Set<PresetKey>
  theme: string | null
  ranges: Partial<Record<RangeKey, { min?: number; max?: number }>>
}

export const DEFAULT_FILTER: FilterState = {
  market: 'ALL',
  presets: new Set<PresetKey>(),
  theme: null,
  ranges: {},
}

// marketCap 원본은 원 단위(표시할 때만 toEok로 억 환산) — 대형주 1조 = 1e12원
const PRESET_TESTS: Record<PresetKey, (row: StockRowRes) => boolean> = {
  lowPer: (row) => row.per !== null && row.per > 0 && row.per < 10,
  highDividend: (row) => row.dividendYield !== null && row.dividendYield >= 3,
  highRoe: (row) => row.roe !== null && row.roe >= 10,
  largeCap: (row) => row.marketCap !== null && row.marketCap >= 1e12,
}

// 범위 입력은 화면 표기 단위(시총=억)로 받으므로 비교 전에 원 단위로 되돌린다
const RANGE_SCALE: Record<RangeKey, number> = {
  marketCap: 1e8,
  per: 1,
  pbr: 1,
  roe: 1,
  dividendYield: 1,
}

const RANGE_KEYS: RangeKey[] = ['marketCap', 'per', 'pbr', 'roe', 'dividendYield']

export function isFilterActive(state: FilterState): boolean {
  return (
    state.market !== 'ALL' ||
    state.presets.size > 0 ||
    state.theme !== null ||
    RANGE_KEYS.some((key) => {
      const range = state.ranges[key]
      return range !== undefined && (range.min !== undefined || range.max !== undefined)
    })
  )
}

export function applyStockFilters(rows: StockRowRes[], state: FilterState): StockRowRes[] {
  return rows.filter((row) => {
    if (state.market !== 'ALL' && row.market !== state.market) return false
    if (state.theme !== null && row.themeName !== state.theme) return false
    for (const preset of state.presets) {
      if (!PRESET_TESTS[preset](row)) return false
    }
    for (const key of RANGE_KEYS) {
      const range = state.ranges[key]
      if (range === undefined || (range.min === undefined && range.max === undefined)) continue
      const value = row[key]
      if (value === null) return false
      const scale = RANGE_SCALE[key]
      if (range.min !== undefined && value < range.min * scale) return false
      if (range.max !== undefined && value > range.max * scale) return false
    }
    return true
  })
}

// ── 주소 쿼리 직렬화 ──
// 필터도 주소에 둔다 — 상세에 다녀왔을 때 페이지 번호만 남고 필터가 풀리면 다른 목록이 뜬다.
// market=KOSPI · preset=lowPer,highRoe · theme=반도체 · per=..10 · marketCap=1000..5000 (범위는 화면 표기 단위)

const MARKETS: FilterState['market'][] = ['KOSPI', 'KOSDAQ']
const PRESET_KEYS = Object.keys(PRESET_TESTS) as PresetKey[]
const RANGE_SEPARATOR = '..'

function parseBound(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === '') return undefined
  const num = Number(raw)
  return Number.isFinite(num) ? num : undefined
}

export function filterFromParams(params: URLSearchParams): FilterState {
  const market = MARKETS.find((m) => m === params.get('market')) ?? 'ALL'
  const requested = (params.get('preset') ?? '').split(',')
  const presets = new Set(PRESET_KEYS.filter((key) => requested.includes(key)))
  const ranges: FilterState['ranges'] = {}
  for (const key of RANGE_KEYS) {
    const raw = params.get(key)
    if (raw === null) continue
    const [min, max] = raw.split(RANGE_SEPARATOR)
    const range = { min: parseBound(min), max: parseBound(max) }
    if (range.min !== undefined || range.max !== undefined) ranges[key] = range
  }
  return { market, presets, theme: params.get('theme') || null, ranges }
}

/** params의 필터 항목을 state로 덮어쓴다 (다른 항목은 건드리지 않는다) */
export function filterToParams(state: FilterState, params: URLSearchParams): void {
  if (state.market === 'ALL') params.delete('market')
  else params.set('market', state.market)

  const presets = PRESET_KEYS.filter((key) => state.presets.has(key))
  if (presets.length === 0) params.delete('preset')
  else params.set('preset', presets.join(','))

  if (state.theme === null) params.delete('theme')
  else params.set('theme', state.theme)

  for (const key of RANGE_KEYS) {
    const range = state.ranges[key]
    if (range === undefined || (range.min === undefined && range.max === undefined)) {
      params.delete(key)
    } else {
      params.set(key, `${range.min ?? ''}${RANGE_SEPARATOR}${range.max ?? ''}`)
    }
  }
}
