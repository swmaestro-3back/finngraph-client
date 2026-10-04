import type { QuoteOf, StockIssueOf, StockIssueRef } from '@/lib/fg/stocks'

function seed(ticker: string): number {
  let hash = 7
  for (const char of ticker) hash = (hash * 31 + char.charCodeAt(0)) % 100003
  return hash
}

export const stockQuoteFixture: QuoteOf = (stock) => {
  if (stock.price === null) return null
  const h = seed(stock.ticker)
  const high52 = h % 11 === 0 ? stock.price : Math.round(stock.price * (1 + (h % 37) / 100 + 0.01))
  const tradingValue = stock.marketCap === null ? null : Math.round((stock.marketCap * ((h % 40) + 2)) / 10000)
  return { high52, tradingValue }
}

const ISSUES: readonly StockIssueRef[] = [
  { id: 103, title: '반도체 장비 수출 규제, 국내 소재 공급망 재편', mediaCount: 23 },
  { id: 104, title: '미국 금리 인하 기대에 반도체주 강세', mediaCount: 14 },
  { id: 101, title: '전력망 투자 확대, 변압기·전선 주문 증가', mediaCount: 15 },
  { id: 105, title: '임상 3상 결과 발표 연기, 바이오 투자심리 위축', mediaCount: 7 },
]

export const stockIssueFixture: StockIssueOf = (stock) => {
  const h = seed(stock.ticker)
  return h % 4 === 0 ? null : ISSUES[h % ISSUES.length]
}
