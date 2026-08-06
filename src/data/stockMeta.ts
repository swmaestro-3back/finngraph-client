// 종목 코드 기반 메타 정보 — 주식 DB와 테마 상세가 같은 값을 쓰도록 공유하는 결정적 생성 규칙

export type Market = 'KOSPI' | 'KOSDAQ'

export function hashString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function getMarket(code: string): Market {
  return hashString(`${code}-mkt`) % 3 === 0 ? 'KOSDAQ' : 'KOSPI'
}

/**
 * 시가총액(억 단위) — 주가가 높을수록 발행주식수(억주)가 적어지도록 보정해 분포시킨다.
 * 주가(원) × 발행주식수(억주) = 시가총액(억원).
 * (SK하이닉스는 주식 상세 스탯 타일과 동일하게 7.28억주 고정)
 */
export function getMarketCap(code: string, price: number): number {
  const shares =
    code === '000660'
      ? 7.28
      : (0.4 + (hashString(code) % 90) / 20) * (60000 / (price + 12000))
  return Math.max(1, Math.round(price * shares))
}

/** 거래대금(백만 단위) — 종목명 해시로 거래량을 만들어 주가와 곱한다 */
export function getTradingValue(name: string, price: number): number {
  return Math.round((price * (30000 + (hashString(name) % 900000))) / 1e6)
}
