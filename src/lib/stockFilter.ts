import type { StockRowRes } from '@/lib/apiTypes'
import { week52Mark } from '@/lib/fg/stockQuote'

export type PresetKey =
  | 'largeCap'
  | 'lowPer'
  | 'highRoe'
  | 'highDividend'
  | 'week52High'
  | 'week52Low'
  | 'rising'
  | 'falling'
  | 'valueTop100'
export type RangeKey = 'marketCap' | 'per' | 'pbr' | 'roe' | 'dividendYield' | 'change'

export interface FilterState {
  market: 'ALL' | 'KOSPI' | 'KOSDAQ'
  presets: Set<PresetKey>
  ranges: Partial<Record<RangeKey, { min?: number; max?: number }>>
  themeId?: number | null
  themeQ?: string | null
  nameQ?: string | null
}

export interface FilterContext {
  basisDate?: string | null
  themeTickers?: ReadonlySet<string> | null
}

export const DEFAULT_FILTER: FilterState = {
  market: 'ALL',
  presets: new Set<PresetKey>(),
  ranges: {},
  themeId: null,
  themeQ: null,
  nameQ: null,
}

/** 대형주 = 전체 종목 중 시가총액 순위 1~LARGE_CAP_RANK위 */
export const LARGE_CAP_RANK = 100
/** 거래대금 상위 = 지금 시장 탭 안에서 거래대금 순위 1~VALUE_TOP_RANK위 */
export const VALUE_TOP_RANK = 100
export const THEME_QUERY_MAX = 30
export const NAME_QUERY_MAX = 30

type SpecialPreset = 'largeCap' | 'valueTop100' | 'week52High' | 'week52Low'

// 값만 보면 되는 프리셋 — 대형주·거래대금 상위는 순위, 52주 신고가·신저가는 기준일이 필요해 따로 가린다
const VALUE_PRESET_TESTS: Record<Exclude<PresetKey, SpecialPreset>, (row: StockRowRes) => boolean> = {
  lowPer: (row) => row.per !== null && row.per > 0 && row.per < 10,
  highRoe: (row) => row.roe !== null && row.roe >= 10,
  highDividend: (row) => row.dividendYield !== null && row.dividendYield >= 5,
  rising: (row) => row.change !== null && row.change > 0,
  falling: (row) => row.change !== null && row.change < 0,
}

/** 시가총액 상위 LARGE_CAP_RANK종목의 ticker — 시장 필터와 무관하게 받은 목록 전체에서 센다 */
function largeCapTickers(rows: StockRowRes[]): Set<string> {
  return new Set(
    rows
      .filter((row) => row.marketCap !== null)
      .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
      .slice(0, LARGE_CAP_RANK)
      .map((row) => row.ticker),
  )
}

/** 거래대금 상위 VALUE_TOP_RANK종목의 ticker — 지금 고른 시장 탭 안에서만 센다 */
function tradeValueTopTickers(rows: StockRowRes[], market: FilterState['market']): Set<string> {
  const pool = market === 'ALL' ? rows : rows.filter((row) => row.market === market)
  return new Set(
    pool
      .filter((row) => row.tradeValue != null)
      .sort((a, b) => (b.tradeValue ?? 0) - (a.tradeValue ?? 0))
      .slice(0, VALUE_TOP_RANK)
      .map((row) => row.ticker),
  )
}

// 범위 입력은 화면 표기 단위(시총=억)로 받으므로 비교 전에 원 단위로 되돌린다
const RANGE_SCALE: Record<RangeKey, number> = {
  marketCap: 1e8,
  per: 1,
  pbr: 1,
  roe: 1,
  dividendYield: 1,
  change: 1,
}

const RANGE_KEYS: RangeKey[] = ['marketCap', 'per', 'pbr', 'roe', 'dividendYield', 'change']

export function isFilterActive(state: FilterState): boolean {
  return (
    state.market !== 'ALL' ||
    state.presets.size > 0 ||
    themeFilterOn(state) ||
    (state.nameQ ?? '') !== '' ||
    RANGE_KEYS.some((key) => {
      const range = state.ranges[key]
      return range !== undefined && (range.min !== undefined || range.max !== undefined)
    })
  )
}

/** 시가총액·PER·PBR·등락률 범위 + ROE·배당수익률 최소 등 패널 필터만 센다(시장·조건 칩은 뺀다) */
export function themeFilterOn(state: Pick<FilterState, 'themeId' | 'themeQ'>): boolean {
  return (state.themeId ?? null) !== null || (state.themeQ ?? '') !== ''
}

export function panelFilterCount(state: Pick<FilterState, 'ranges' | 'themeId' | 'themeQ' | 'nameQ'>): number {
  const rangeCount = RANGE_KEYS.filter((key) => {
    const range = state.ranges[key]
    return range !== undefined && (range.min !== undefined || range.max !== undefined)
  }).length
  return rangeCount + (themeFilterOn(state) ? 1 : 0) + ((state.nameQ ?? '') !== '' ? 1 : 0)
}

export function applyStockFilters(rows: StockRowRes[], state: FilterState, context: FilterContext = {}): StockRowRes[] {
  const largeCaps = state.presets.has('largeCap') ? largeCapTickers(rows) : null
  const valueTops = state.presets.has('valueTop100') ? tradeValueTopTickers(rows, state.market) : null
  const basisDate = context.basisDate ?? null
  const themeOn = themeFilterOn(state)
  const nameQ = (state.nameQ ?? '').trim().toLowerCase()
  return rows.filter((row) => {
    if (state.market !== 'ALL' && row.market !== state.market) return false
    if (themeOn && !context.themeTickers?.has(row.ticker)) return false
    if (nameQ !== '' && !row.name.toLowerCase().includes(nameQ) && !row.ticker.toLowerCase().includes(nameQ)) return false
    for (const preset of state.presets) {
      if (preset === 'largeCap') {
        if (!largeCaps?.has(row.ticker)) return false
      } else if (preset === 'valueTop100') {
        if (!valueTops?.has(row.ticker)) return false
      } else if (preset === 'week52High') {
        if (week52Mark(row, basisDate) !== 'high') return false
      } else if (preset === 'week52Low') {
        if (week52Mark(row, basisDate) !== 'low') return false
      } else if (!VALUE_PRESET_TESTS[preset](row)) return false
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
// market=KOSPI · preset=lowPer,highRoe · per=..10 · marketCap=1000..5000(범위는 화면 표기 단위) · theme=12

const MARKETS: FilterState['market'][] = ['KOSPI', 'KOSDAQ']
const PRESET_KEYS: PresetKey[] = [
  'largeCap',
  'lowPer',
  'highRoe',
  'highDividend',
  'week52High',
  'week52Low',
  'rising',
  'falling',
  'valueTop100',
]
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
  const themeRaw = params.get('theme')
  const themeId = themeRaw !== null && /^\d+$/.test(themeRaw) ? Number(themeRaw) : null
  const themeQRaw = (params.get('themeq') ?? '').trim().slice(0, THEME_QUERY_MAX)
  const themeQ = themeId === null && themeQRaw !== '' ? themeQRaw : null
  const nameQRaw = (params.get('name') ?? '').trim().slice(0, NAME_QUERY_MAX)
  return { market, presets, ranges, themeId, themeQ, nameQ: nameQRaw === '' ? null : nameQRaw }
}

/** params의 필터 항목을 state로 덮어쓴다 (다른 항목은 건드리지 않는다) */
export function filterToParams(state: FilterState, params: URLSearchParams): void {
  if (state.market === 'ALL') params.delete('market')
  else params.set('market', state.market)

  const presets = PRESET_KEYS.filter((key) => state.presets.has(key))
  if (presets.length === 0) params.delete('preset')
  else params.set('preset', presets.join(','))

  for (const key of RANGE_KEYS) {
    const range = state.ranges[key]
    if (range === undefined || (range.min === undefined && range.max === undefined)) {
      params.delete(key)
    } else {
      params.set(key, `${range.min ?? ''}${RANGE_SEPARATOR}${range.max ?? ''}`)
    }
  }

  const themeId = state.themeId ?? null
  if (themeId === null) params.delete('theme')
  else params.set('theme', String(themeId))

  const themeQ = themeId === null ? (state.themeQ ?? '').trim() : ''
  if (themeQ === '') params.delete('themeq')
  else params.set('themeq', themeQ)

  const nameQ = (state.nameQ ?? '').trim()
  if (nameQ === '') params.delete('name')
  else params.set('name', nameQ)
}
