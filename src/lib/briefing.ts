import type { StockRowRes, ThemeRes } from '@/lib/apiTypes'

export interface HeadlineTopTheme {
  id: number
  name: string
  change: number
  leader: string | null
}

export interface HeadlineBottomTheme {
  id: number
  name: string
  change: number
}

// 문장 문자열이 아니라 세그먼트 객체 — 컴포넌트가 숫자·테마명만 골라 강조 렌더한다
export interface MarketHeadline {
  up: number
  down: number
  flat: number
  topTheme: HeadlineTopTheme | null
  bottomTheme: HeadlineBottomTheme | null
}

export interface TopValueTheme {
  id: number
  name: string
  tradingValue: number
  change: number | null
}

export interface BriefingParagraph extends MarketHeadline {
  total: number
  upRatio: number
  topValueTheme: TopValueTheme | null
}

export interface MarketBreadth {
  up: number
  down: number
  flat: number
  total: number
  /** 상승 종목 비율(%) — 분모는 up+down+flat 전체 */
  upRatio: number
}

// '상승 종목 비율'의 분모 정의는 여기 한 곳뿐이다 — 대시보드 게이지와 브리핑 문장이 같은 수치를 보여야 한다
export function computeBreadth(stocks: StockRowRes[]): MarketBreadth {
  let up = 0
  let down = 0
  let flat = 0
  for (const s of stocks) {
    if (s.change === null) continue
    if (s.change > 0) up += 1
    else if (s.change < 0) down += 1
    else flat += 1
  }
  const total = up + down + flat
  return { up, down, flat, total, upRatio: total === 0 ? 0 : (up / total) * 100 }
}

export function pickMovers(stocks: StockRowRes[], count: number): StockRowRes[] {
  return stocks
    .filter((s) => s.change !== null)
    .sort((a, b) => Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0))
    .slice(0, count)
}

export function pickSpotlightThemes(themes: ThemeRes[], count: number): ThemeRes[] {
  return themes
    .filter((t) => t.change !== null)
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
    .slice(0, count)
}

export function buildMarketHeadline(
  stocks: StockRowRes[],
  themes: ThemeRes[],
): MarketHeadline {
  const { up, down, flat } = computeBreadth(stocks)

  const ranked = themes
    .filter((t) => t.change !== null)
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))
  // 부호를 요구한다 — 전 테마 하락일에 하락 테마를 '가장 강한/뜨거운 테마'로 서술하지 않기 위함
  const first = ranked[0]
  const top = first && (first.change ?? 0) > 0 ? first : undefined
  const last = ranked[ranked.length - 1]
  const bottom = ranked.length > 1 && (last.change ?? 0) < 0 ? last : undefined

  return {
    up,
    down,
    flat,
    topTheme: top
      ? {
          id: top.id,
          name: top.name,
          change: top.change ?? 0,
          leader: top.topStocks[0]?.name ?? null,
        }
      : null,
    bottomTheme: bottom
      ? { id: bottom.id, name: bottom.name, change: bottom.change ?? 0 }
      : null,
  }
}

export function buildBriefingParagraph(
  stocks: StockRowRes[],
  themes: ThemeRes[],
): BriefingParagraph {
  const headline = buildMarketHeadline(stocks, themes)
  const { total, upRatio } = computeBreadth(stocks)

  const topValue = themes
    .filter((t) => t.tradingValue !== null)
    .sort((a, b) => (b.tradingValue ?? 0) - (a.tradingValue ?? 0))[0]

  return {
    ...headline,
    total,
    upRatio,
    topValueTheme: topValue
      ? {
          id: topValue.id,
          name: topValue.name,
          tradingValue: topValue.tradingValue ?? 0,
          change: topValue.change,
        }
      : null,
  }
}
