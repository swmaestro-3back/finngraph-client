import type { GraphNode } from '@/data/graphTypes'

/** 토스증권 CDN의 종목 로고 — 국내는 6자리 코드, 해외는 티커로 바로 찾는다. 없는 종목은 로드 실패로 떨어진다 */
export function stockLogoUrl(ticker: string): string {
  return `https://static.toss.im/png-icons/securities/icn-sec-fill-${encodeURIComponent(ticker)}.png`
}

/** 로고를 그릴 수 있는 노드인가 — 티커가 있는 기업만 */
export function nodeLogoUrl(node: GraphNode): string | null {
  if (node.type !== 'company') return null
  const ticker = node.data.ticker
  return typeof ticker === 'string' && ticker ? stockLogoUrl(ticker) : null
}
