import type {
  ThemeRes,
  ThemeStockChangeStatus,
  ThemeStockRes,
} from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { hasTurnoverRatio } from '@/lib/treemapColor'

export const DATA_SOURCE_NOTICE =
  '시세는 한국투자증권 API 장마감 일봉 기준입니다. 참고용이며 투자 결과에 대한 책임은 지지 않습니다.'

export const METRIC_HELP_LINES = {
  universe: '집계 대상: 활성 보통주 · 거래정지·정리매매·시세 결손 제외',
  hot: '핫 테마 = 5종목 이상 집계 · 시장보다 넓은 방향성 · 신뢰구간 하한 기준',
} as const

export function breadthLabel(up: number, flat: number, down: number): string {
  return `▲${up} ·${flat} ▼${down}`
}

export function countLabel(priced: number, total: number): string {
  return priced === total ? `${total}종목` : `${priced}/${total}종목`
}

export function isUnderCounted(pricedCount: number, stockCount: number): boolean {
  return pricedCount < 5 || pricedCount * 10 < stockCount * 7
}

export const UNDER_COUNTED_TITLE = '집계 종목 부족 · 핫 테마 제외'

export function hotExclusionTitle(theme: ThemeRes): string | null {
  if (theme.pricedCount === undefined) return null
  if (theme.hotSide !== null && theme.hotSide !== undefined) return null
  return isUnderCounted(theme.pricedCount, theme.stockCount) ? UNDER_COUNTED_TITLE : null
}

export function formatShortDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-').map(Number)
  if (!m || !d) return isoDate
  return `${m}/${d}`
}

export function closeDateLabel(baseDate: string | null | undefined): string | null {
  return baseDate ? `${formatShortDate(baseDate)} 종가` : null
}

export function sensitivityLabel(sensitivity: number | null | undefined): string | null {
  if (sensitivity === null || sensitivity === undefined || sensitivity < 1) return null
  return `한 종목 제외 시 최대 ±${sensitivity.toFixed(1)}%p`
}

export function metricCaption(theme: ThemeRes): string[] | null {
  if (theme.pricedCount === undefined) return null
  const parts: string[] = []
  if (theme.meanChange !== null && theme.meanChange !== undefined) {
    parts.push(`단순평균 ${formatChange(theme.meanChange)}`)
  }
  const sensitivity = sensitivityLabel(theme.sensitivity)
  if (sensitivity) parts.push(sensitivity)
  return parts.length > 0 ? parts : null
}

export function hasBreadth(
  theme: ThemeRes,
): theme is ThemeRes & { pricedCount: number; upCount: number; downCount: number } {
  return (
    theme.pricedCount !== undefined &&
    theme.upCount !== undefined &&
    theme.downCount !== undefined
  )
}

export function themeBreadthLabel(theme: ThemeRes): string | null {
  if (!hasBreadth(theme)) return null
  const flat = theme.flatCount ?? Math.max(0, theme.pricedCount - theme.upCount - theme.downCount)
  return breadthLabel(theme.upCount, flat, theme.downCount)
}

export function tileDetail(theme: ThemeRes): string | null {
  if (!hasBreadth(theme)) return null
  return `▲${theme.upCount} ▼${theme.downCount}`
}

export const TILE_DETAIL_MIN_HEIGHT = 72
export const TILE_PCT_MIN_HEIGHT = 36
const TILE_DETAIL_CHAR_WIDTH = 6.6
const TILE_DETAIL_PADDING = 16

export type TileDetailPlacement = 'line' | 'inline' | 'none'

function fitsWidth(width: number, text: string): boolean {
  return width >= text.length * TILE_DETAIL_CHAR_WIDTH + TILE_DETAIL_PADDING
}

export function tileDetailPlacement(
  width: number,
  height: number,
  pctText: string,
  detail: string,
): TileDetailPlacement {
  if (!detail || height < TILE_PCT_MIN_HEIGHT) return 'none'
  if (height >= TILE_DETAIL_MIN_HEIGHT && fitsWidth(width, detail)) return 'line'
  if (fitsWidth(width, `${pctText} ${detail}`)) return 'inline'
  return 'none'
}

export const TURNOVER_WINDOW_LABEL = '20일 평균'

export function turnoverMultiple(ratio: number | null | undefined): string | null {
  if (!hasTurnoverRatio(ratio)) return null
  return `${(Math.round(ratio * 10) / 10).toFixed(1)}배`
}

export const TURNOVER_EMPHASIS_RATIO = 2

export interface TurnoverFact {
  multiple: string
  emphasized: boolean
}

export function turnoverFact(ratio: number | null | undefined): TurnoverFact | null {
  const multiple = turnoverMultiple(ratio)
  if (!multiple || !hasTurnoverRatio(ratio)) return null
  return { multiple: `${TURNOVER_WINDOW_LABEL}의 ${multiple}`, emphasized: ratio >= TURNOVER_EMPHASIS_RATIO }
}

export function tileLabel(theme: ThemeRes, baseDate: string | null | undefined): string {
  const parts = [`${theme.name} ${theme.change === null ? '—' : formatChange(theme.change)}`]
  if (hasBreadth(theme)) {
    parts.push(`집계 ${theme.pricedCount}/${theme.stockCount}`)
    parts.push(themeBreadthLabel(theme) as string)
  }
  const close = closeDateLabel(baseDate ?? theme.baseDate)
  if (close) parts.push(close)
  return parts.join(' · ')
}

export type ThemeLeadStock =
  | { kind: 'leader'; name: string; change: number }
  | { kind: 'representative'; name: string }

export function leadStock(theme: Pick<ThemeRes, 'leaders' | 'topStocks'>): ThemeLeadStock | null {
  if (theme.leaders !== undefined) {
    const lead = theme.leaders.find((l) => l.change !== null)
    return lead && lead.change !== null ? { kind: 'leader', name: lead.name, change: lead.change } : null
  }
  const top = theme.topStocks[0]
  return top ? { kind: 'representative', name: top.name } : null
}

export function coverageBanner(
  coverage: number | null | undefined,
  hotCount: number | null,
): string | null {
  const low = coverage !== null && coverage !== undefined && coverage < 0.8
  const empty = hotCount === 0
  if (!low && !empty) return null
  const suffix =
    coverage === null || coverage === undefined
      ? ''
      : ` (${Math.round(coverage * 100)}% 종목 반영)`
  return `시세 적재가 끝나지 않아 핫 테마를 잠시 비워 둡니다${suffix}`
}

/** 등락률을 낼 수 없는 종목에 붙이는 사유 태그. 절사평균에서 빠진 종목(TRIMMED)은 등락률이 실제 값이라 태그를 달지 않는다 */
export interface ChangeStatusTag {
  label: string
  title: string
}

export function changeStatusTag(status: ThemeStockChangeStatus | undefined): ChangeStatusTag | null {
  switch (status) {
    case 'SUSPENDED':
      return {
        label: '거래정지',
        title: '거래정지 종목이라 이날 등락률을 산출하지 않았습니다.',
      }
    case 'DELISTING':
      return {
        label: '정리매매',
        title: '정리매매 종목은 테마 집계에 넣지 않습니다.',
      }
    case 'NO_CANDLE':
    case 'NO_PREV':
      return {
        label: '시세 없음',
        title: '이날 또는 전 거래일 시세가 없어 등락률을 낼 수 없습니다.',
      }
    default:
      return null
  }
}

function isMissing(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))
}

export function compareNullLast(av: unknown, bv: unknown, desc: boolean): number {
  const aMissing = isMissing(av)
  const bMissing = isMissing(bv)
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1
  const compared =
    typeof av === 'string' && typeof bv === 'string'
      ? av.localeCompare(bv, 'ko')
      : Number(av) - Number(bv)
  return desc ? -compared : compared
}

export interface MarketCapLeader {
  stock: ThemeStockRes
  /** 구성 종목 시가총액 합 대비 비중(%) — 시가총액이 없으면 null */
  share: number | null
}

/** 시가총액 상위 종목 — 응답 순서에 기대지 않고 직접 정렬한다 */
export function marketCapLeaders(stocks: ThemeStockRes[], limit = 3): MarketCapLeader[] {
  const total = stocks.reduce((sum, s) => sum + (s.marketCap ?? 0), 0)
  return [...stocks]
    .sort((a, b) => compareNullLast(a.marketCap, b.marketCap, true))
    .slice(0, limit)
    .map((stock) => ({
      stock,
      share: stock.marketCap === null || total <= 0 ? null : (stock.marketCap / total) * 100,
    }))
}
