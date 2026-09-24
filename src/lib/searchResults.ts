import { marketCategory, type GraphFocus, type NodeCategory } from '@/data/graphTypes'
import type { StockRowRes, ThemeRes } from '@/lib/apiTypes'

/** 검색 드롭다운 한 줄 — 종목과 테마를 같은 목록에 섞어 보이되 색 점으로 구분한다 */
export interface SearchResult {
  key: string
  label: string
  /** 우측 보조 표기 — 종목은 코드, 테마는 '테마' */
  meta: string
  category: NodeCategory
  focus: GraphFocus
}

export type SearchableStock = Pick<StockRowRes, 'ticker' | 'name' | 'market'>
export type SearchableTheme = Pick<ThemeRes, 'name'>

const MAX_RESULTS = 8
/** 결과 8칸 중 테마에 내주는 최대 칸 — 종목이 훨씬 많아 테마가 밀려나지 않도록 */
const THEME_SLOTS = 3

/**
 * 헤더·그래프 사이드바가 공유하는 검색 결과.
 * 첫 행이 Enter 기본 선택지이므로 이름·코드 정확 일치 종목을 맨 앞에 둔다.
 */
export function searchResults(
  rawQuery: string,
  stocks: readonly SearchableStock[],
  themes: readonly SearchableTheme[],
): SearchResult[] {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return []

  const themeHits = themes.filter((t) => t.name.toLowerCase().includes(q)).slice(0, THEME_SLOTS)

  const exact: SearchableStock[] = []
  const partial: SearchableStock[] = []
  for (const s of stocks) {
    const name = s.name.toLowerCase()
    if (name === q || s.ticker === q) exact.push(s)
    else if (name.includes(q) || s.ticker.includes(q)) partial.push(s)
  }
  const stockHits = [...exact, ...partial].slice(0, MAX_RESULTS - themeHits.length)

  return [
    ...stockHits.map(
      (s): SearchResult => ({
        key: `company:${s.ticker}`,
        label: s.name,
        meta: s.ticker,
        category: marketCategory(s.market),
        focus: { kind: 'company', ticker: s.ticker },
      }),
    ),
    ...themeHits.map(
      (t): SearchResult => ({
        key: `theme:${t.name}`,
        label: t.name,
        meta: '테마',
        category: 'theme',
        focus: { kind: 'theme', name: t.name },
      }),
    ),
  ]
}
