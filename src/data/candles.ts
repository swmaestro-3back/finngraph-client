// 결정적 캔들/거래량 더미데이터 생성기 (design-specs/theme-detail.md §1.4)

export type CandlePeriod = 'D' | 'W' | 'M'

export interface Candle {
  open: number
  high: number
  low: number
  close: number
  volume: number
  label: string
}

export const CANDLE_COUNTS: Record<CandlePeriod, number> = { D: 65, W: 52, M: 36 }

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashString(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** 축 위 한 칸 — 캔들과 이슈 레인이 같은 날짜 도메인을 쓰도록 공유한다 */
export interface CandleDate {
  /** 축에 찍히는 짧은 라벨 */
  label: string
  /** 전체 날짜 "2026.07.31" — 패널 제목·정렬용 */
  date: string
}

/** 기준일 2026-07-31에서 역산한 날짜 */
function candleDate(index: number, count: number, period: CandlePeriod): CandleDate {
  const base = new Date(2026, 6, 31)
  const stepDays = period === 'D' ? 1 : period === 'W' ? 7 : 30
  const d = new Date(base)
  d.setDate(base.getDate() - (count - 1 - index) * stepDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return {
    label: period === 'M' ? `${y}.${m}` : `${d.getMonth() + 1}/${d.getDate()}`,
    date: `${y}.${m}.${String(d.getDate()).padStart(2, '0')}`,
  }
}

/**
 * 기간별 날짜 축 전체.
 * 이슈 레인은 캔들과 같은 축에 그려지므로 날짜를 따로 만들지 않고 이걸 소비한다
 * (주봉 한 칸 = 그 주, 월봉 한 칸 = 그 달).
 */
export function candleDates(period: CandlePeriod): CandleDate[] {
  const count = CANDLE_COUNTS[period]
  return Array.from({ length: count }, (_, i) => candleDate(i, count, period))
}

/** 테마/종목별 결정적 캔들 시리즈. 마지막 종가가 endPrice로 수렴 */
export function generateCandles(
  seedKey: string,
  period: CandlePeriod,
  endPrice: number,
  totalChangePct: number,
): Candle[] {
  const count = CANDLE_COUNTS[period]
  // 캔들 라벨도 candleDates()를 거친다 — 이슈 레인과 같은 축이라는 게 구조적으로 보장된다
  const dates = candleDates(period)
  const rand = mulberry32(hashString(`${seedKey}-${period}`))
  const drift = totalChangePct / 100 / count
  const vol = period === 'D' ? 0.012 : period === 'W' ? 0.024 : 0.04

  // 뒤에서부터(최근→과거) 역산해 마지막 종가 = endPrice
  const closes: number[] = new Array(count)
  closes[count - 1] = endPrice
  for (let i = count - 2; i >= 0; i--) {
    const shock = (rand() - 0.5) * 2 * vol
    closes[i] = closes[i + 1] / (1 + drift + shock)
  }

  return closes.map((close, i) => {
    const open = i === 0 ? close * (1 + (rand() - 0.5) * vol) : closes[i - 1]
    const hi = Math.max(open, close) * (1 + rand() * vol * 0.6)
    const lo = Math.min(open, close) * (1 - rand() * vol * 0.6)
    return {
      open: Math.round(open),
      high: Math.round(hi),
      low: Math.round(lo),
      close: Math.round(close),
      volume: Math.round(80 + rand() * 920),
      label: dates[i].label,
    }
  })
}
