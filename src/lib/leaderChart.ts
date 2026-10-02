import type { CandleRes } from '@/lib/apiTypes'

export interface ReturnPoint {
  /** 공통 날짜축(dates)에서의 위치 */
  index: number
  pct: number
  /** 그날 종가 — 평균 선에는 없다 */
  close?: number
}

export interface BandPoint {
  index: number
  upper: number
  lower: number
}

export interface ReturnSeries {
  points: ReturnPoint[]
  /** 볼린저 밴드 — 창이 차지 않은 앞쪽 날짜는 빠진다 */
  band: BandPoint[]
  periodReturn: number
}

export interface ReturnChart {
  dates: string[]
  /** 입력 순서 그대로 — 시세가 모자란 종목은 null */
  series: (ReturnSeries | null)[]
  /** 종목 수익률의 단순 평균 — 종목이 둘 이상일 때만 */
  average: ReturnSeries | null
  /** 선만 담는 세로 범위 */
  min: number
  max: number
  /** 선에 평균 밴드까지 담는 세로 범위 */
  bandMin: number
  bandMax: number
}

export interface BandOptions {
  window: number
  k: number
}

/** 볼린저 밴드 기본값 — 20일 이동평균 ± 2 표준편차 */
export const DEFAULT_BAND: BandOptions = { window: 20, k: 2 }

/** 각 위치에서 직전 window개의 평균 ± k·모표준편차. 창이 차기 전에는 null */
export function bollinger(
  values: number[],
  window: number,
  k: number,
): ({ upper: number; lower: number } | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) return null
    const slice = values.slice(i - window + 1, i + 1)
    const mean = slice.reduce((sum, v) => sum + v, 0) / window
    const sd = Math.sqrt(slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / window)
    return { upper: mean + k * sd, lower: mean - k * sd }
  })
}

/**
 * 여러 종목의 일봉을 "구간 첫 종가 대비 수익률"로 바꿔 같은 날짜축·세로축에 올린다.
 * 종목마다 거래일이 다를 수 있어(거래정지·신규상장) 순번이 아니라 날짜로 맞춘다.
 * 구간은 마지막 limit개(이력이 짧은 종목이 있으면 그 종목의 첫날부터)이고,
 * 그 앞 시세는 밴드 첫 값을 내는 준비 구간으로만 쓴다.
 */
export function buildReturnChart(
  candleSets: (CandleRes[] | null)[],
  limit: number,
  { window, k }: BandOptions = DEFAULT_BAND,
): ReturnChart | null {
  const sliced = candleSets.map((candles) => {
    const all = candles ?? []
    const rangeStart = Math.max(all.length - limit, 0)
    return all.length - rangeStart < 2 ? null : { all, rangeStart }
  })
  // 이력이 짧은 종목이 있으면 모두 같은 날부터 비교한다 — 0% 기준일이 다르면 수익률을 견줄 수 없다
  const commonStart = sliced.reduce(
    (latest, s) => (s && s.all[s.rangeStart].date > latest ? s.all[s.rangeStart].date : latest),
    '',
  )
  const stocks = sliced.map((s) => {
    if (!s) return null
    const rangeStart = s.all.findIndex((c) => c.date >= commonStart)
    if (rangeStart === -1 || s.all.length - rangeStart < 2) return null
    // 준비 구간까지 같은 기준(구간 첫 종가)으로 환산해야 밴드가 선과 같은 축에 놓인다
    const base = s.all[rangeStart].close || 1
    return {
      closes: s.all.map((c) => c.close),
      dates: s.all.map((c) => c.date),
      pcts: s.all.map((c) => ((c.close - base) / base) * 100),
      rangeStart,
    }
  })

  const dates = [...new Set(stocks.flatMap((s) => s?.dates.slice(s.rangeStart) ?? []))].sort()
  if (dates.length < 2) return null
  const indexOf = new Map(dates.map((date, i) => [date, i]))

  // rangeStart 앞은 밴드 계산에만 쓰고, 그 뒤만 선과 밴드로 내보낸다
  const toSeries = (
    pcts: number[],
    pctDates: string[],
    rangeStart: number,
    closes?: number[],
  ): ReturnSeries | null => {
    const bands = bollinger(pcts, window, k)
    const points: ReturnPoint[] = []
    const band: BandPoint[] = []
    for (let i = rangeStart; i < pcts.length; i++) {
      const index = indexOf.get(pctDates[i])
      if (index === undefined) continue
      points.push(closes ? { index, pct: pcts[i], close: closes[i] } : { index, pct: pcts[i] })
      const b = bands[i]
      if (b) band.push({ index, ...b })
    }
    if (points.length < 2) return null
    return { points, band, periodReturn: points[points.length - 1].pct }
  }

  const series = stocks.map((s) =>
    s ? toSeries(s.pcts, s.dates, s.rangeStart, s.closes) : null,
  )

  // 평균: 날짜마다 종목 수익률을 평균한다 — 시세가 빠진 날은 직전 값을 이어 쓴다
  const valid = stocks.filter((s) => s !== null)
  let average: ReturnSeries | null = null
  if (valid.length >= 2) {
    const pctByDate = valid.map((s) => new Map(s.dates.map((date, i) => [date, s.pcts[i]])))
    const allDates = [...new Set(valid.flatMap((s) => s.dates))].sort()
    const last: (number | undefined)[] = valid.map(() => undefined)
    const pcts: number[] = []
    const pctDates: string[] = []
    for (const date of allDates) {
      pctByDate.forEach((byDate, i) => {
        last[i] = byDate.get(date) ?? last[i]
      })
      const known = last.filter((v) => v !== undefined)
      if (known.length === 0) continue
      pcts.push(known.reduce((sum, v) => sum + v, 0) / known.length)
      pctDates.push(date)
    }
    const rangeStart = pctDates.findIndex((date) => date >= dates[0])
    average = toSeries(pcts, pctDates, rangeStart)
  }

  const linePcts = series.flatMap((s) => s?.points.map((p) => p.pct) ?? [])
  const bandPcts = average?.band.flatMap((b) => [b.upper, b.lower]) ?? []
  const min = Math.min(...linePcts)
  const max = Math.max(...linePcts)
  return {
    dates,
    series,
    average,
    min,
    max,
    bandMin: Math.min(min, ...bandPcts),
    bandMax: Math.max(max, ...bandPcts),
  }
}

export function nearestDateIndex(ratio: number, dateCount: number): number {
  const index = Math.round(ratio * (dateCount - 1))
  return Math.min(Math.max(index, 0), dateCount - 1)
}

/** 세로축 눈금 — min~max 안에서 1·2·2.5·5 단위로 떨어지는 값을, maxCount개를 넘지 않는 한 가장 촘촘하게 */
export function niceTicks(min: number, max: number, maxCount = 6): number[] {
  const magnitude = 10 ** Math.floor(Math.log10((max - min || 1) / maxCount))
  for (const factor of [1, 2, 2.5, 5, 10, 20, 25, 50]) {
    const step = factor * magnitude
    const ticks: number[] = []
    for (let i = Math.ceil(min / step); i * step <= max; i++) {
      ticks.push(Number((i * step).toFixed(6)))
    }
    if (ticks.length <= maxCount) return ticks
  }
  return []
}

/** 가로축 눈금 — 달이 바뀌는 첫 거래일마다 */
export function monthTicks(dates: string[]): { index: number; label: string }[] {
  return dates.flatMap((date, index) =>
    index > 0 && date.slice(0, 7) !== dates[index - 1].slice(0, 7)
      ? [{ index, label: `${Number(date.slice(5, 7))}월` }]
      : [],
  )
}

/**
 * 선 끝 이름표가 겹치지 않게 세로 위치를 벌린다 — 순서는 지키고 lo~hi를 벗어나지 않는다.
 * 입력과 같은 순서로 돌려준다.
 */
export function spreadLabels(tops: number[], minGap: number, lo: number, hi: number): number[] {
  const order = tops.map((_, i) => i).sort((a, b) => tops[a] - tops[b])
  const placed = order.map((i) => tops[i])
  placed.forEach((top, k) => {
    placed[k] = Math.max(top, k === 0 ? lo : placed[k - 1] + minGap)
  })
  for (let k = placed.length - 1; k >= 0; k--) {
    placed[k] = Math.min(placed[k], k === placed.length - 1 ? hi : placed[k + 1] - minGap)
  }
  const result = [...tops]
  order.forEach((i, k) => {
    result[i] = placed[k]
  })
  return result
}
