import { describe, expect, it } from 'vitest'
import type { NewsDetail, ThemeIndexCandleRes, ThemeRes, ThemeStockRes } from '@/lib/apiTypes'
import {
  NO_THEME_INDEX_TEXT,
  NO_THEME_MOVES_TEXT,
  THEME_MOVE_LIMIT,
  defaultPreview,
  distributionSummary,
  labelWidth,
  layoutDistribution,
  rankedStocks,
  renderedLabels,
  stockPeriodValue,
  themeMoves,
  themePeriodValue,
  topMovers,
} from '@/lib/themeDistribution'

function stock(ticker: string, name: string, change: number | null, marketCap: number | null, extra: Partial<ThemeStockRes> = {}): ThemeStockRes {
  return {
    ticker,
    name,
    market: 'KOSDAQ',
    price: 10_000,
    change,
    tradingValue: 1_000_000_000,
    marketCap,
    reason: `${name} 편입 이유`,
    r1w: null,
    r1m: null,
    r3m: null,
    ...extra,
  }
}

const BATTERY: ThemeStockRes[] = [
  stock('009150', '삼성전기', -0.98, 113_010_509_000_000, { r1w: 0.4, r1m: 6.47, r3m: -30.72 }),
  stock('373220', 'LG에너지솔루션', 0.71, 83_070_000_000_000, { r1w: 1.0 }),
  stock('006400', '삼성SDI', 0.78, 41_501_275_000_000, { r1w: -1.15 }),
  stock('457190', '이수스페셜티케미컬', 16.76, 2_399_309_200_000, { r1w: 22.1 }),
  stock('267320', '나인테크', 9.3, 161_910_300_000, { r1w: null }),
  stock('020150', '롯데에너지머티리얼즈', -1.29, 2_199_330_000_000, { r1w: -3.4 }),
  stock('083930', '아바코', 0, 181_260_950_000, { r1w: 0 }),
  stock('131400', '이브이첨단소재', null, 45_646_706_000, { r1w: null }),
]

const THEME = { change: 2.27, w1: 2.97, m1: 2.89, m3: 1.66 } as ThemeRes

describe('기간별 값 — stockPeriodValue·themePeriodValue', () => {
  it('오늘은 일간 등락, 1주·1달·3달은 종목 기간 수익률', () => {
    expect(stockPeriodValue(BATTERY[0], 'today')).toBe(-0.98)
    expect(stockPeriodValue(BATTERY[0], '1w')).toBe(0.4)
    expect(stockPeriodValue(BATTERY[0], '1m')).toBe(6.47)
    expect(stockPeriodValue(BATTERY[0], '3m')).toBe(-30.72)
    expect(stockPeriodValue(BATTERY[4], '1w')).toBeNull()
  })

  it('필드가 응답에 없으면 null', () => {
    const legacy = { ...BATTERY[1] } as Partial<ThemeStockRes>
    delete legacy.r3m
    expect(stockPeriodValue(legacy as ThemeStockRes, '3m')).toBeNull()
  })

  it('테마 값은 change·w1·m1·m3', () => {
    expect(themePeriodValue(THEME, 'today')).toBe(2.27)
    expect(themePeriodValue(THEME, '1w')).toBe(2.97)
    expect(themePeriodValue(THEME, '1m')).toBe(2.89)
    expect(themePeriodValue(THEME, '3m')).toBe(1.66)
  })
})

describe('rankedStocks·topMovers·defaultPreview', () => {
  it('값이 있는 종목만 내림차순으로, 없는 종목은 개수로', () => {
    const { ranked, missing } = rankedStocks(BATTERY, 'today')
    expect(ranked.map((r) => r.stock.ticker)).toEqual(['457190', '267320', '006400', '373220', '083930', '009150', '020150'])
    expect(missing).toBe(1)
    expect(rankedStocks(BATTERY, '1w').missing).toBe(2)
  })

  it('끈 종목은 상승 상위, 발목 잡은 종목은 하락 하위', () => {
    const { ranked } = rankedStocks(BATTERY, 'today')
    const { gainers, losers } = topMovers(ranked)
    expect(gainers.map((r) => r.stock.name)).toEqual(['이수스페셜티케미컬', '나인테크', '삼성SDI'])
    expect(losers.map((r) => r.stock.name)).toEqual(['롯데에너지머티리얼즈', '삼성전기'])
  })

  it('미리보기 기본 선택은 최대 상승, 상승이 없으면 등락 절댓값 최대', () => {
    expect(defaultPreview(rankedStocks(BATTERY, 'today').ranked)).toBe('457190')
    const allDown = [stock('1', '가', -1, 10), stock('2', '나', -4, 20), stock('3', '다', 0, 30)]
    expect(defaultPreview(rankedStocks(allDown, 'today').ranked)).toBe('2')
    expect(defaultPreview([])).toBeNull()
  })
})

describe('distributionSummary — 요약 한 문장', () => {
  it('상승·하락·보합 개수와 최대 상승, 시총 1위를 사실대로', () => {
    expect(distributionSummary(rankedStocks(BATTERY, 'today').ranked)).toBe(
      '7종목 중 4개 상승 · 2개 하락 · 1개 보합 — 최대 상승 이수스페셜티케미컬 +16.76%, 시총 1위 삼성전기 −0.98%',
    )
  })

  it('최대 상승 종목이 시총 1위면 한 번만 말한다', () => {
    const ranked = rankedStocks([stock('1', '대장', 5, 100), stock('2', '작은', 1, 10)], 'today').ranked
    expect(distributionSummary(ranked)).toBe('2종목 중 2개 상승 · 0개 하락 — 최대 상승이자 시총 1위 대장 +5.00%')
  })

  it('상승이 없으면 최대 하락을 말한다', () => {
    const ranked = rankedStocks([stock('1', '가', -1, 100), stock('2', '나', -4, 10)], 'today').ranked
    expect(distributionSummary(ranked)).toBe('2종목 중 0개 상승 · 2개 하락 — 최대 하락 나 −4.00%, 시총 1위 가 −1.00%')
  })

  it('종목이 없으면 null', () => {
    expect(distributionSummary([])).toBeNull()
  })
})

describe('layoutDistribution — 분포 띠 배치', () => {
  const overlaps = (dots: { x: number; y: number; r: number }[]) => {
    for (let i = 0; i < dots.length; i += 1) {
      for (let j = i + 1; j < dots.length; j += 1) {
        const d = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y)
        if (d < dots[i].r + dots[j].r - 0.01) return true
      }
    }
    return false
  }

  it('점끼리 겹치지 않고 값이 클수록 오른쪽', () => {
    const layout = layoutDistribution(rankedStocks(BATTERY, 'today').ranked, 720)
    expect(overlaps(layout.dots)).toBe(false)
    const byTicker = new Map(layout.dots.map((d) => [d.ticker, d]))
    expect(byTicker.get('457190')!.x).toBeGreaterThan(byTicker.get('267320')!.x)
    expect(byTicker.get('267320')!.x).toBeGreaterThan(byTicker.get('009150')!.x)
  })

  it('반지름은 시총 제곱근 비례, 시총 1위가 최대', () => {
    const layout = layoutDistribution(rankedStocks(BATTERY, 'today').ranked, 720, { rMin: 4, rMax: 16 })
    const byTicker = new Map(layout.dots.map((d) => [d.ticker, d]))
    expect(byTicker.get('009150')!.r).toBeCloseTo(16)
    for (const dot of layout.dots) {
      expect(dot.r).toBeGreaterThanOrEqual(4)
      expect(dot.r).toBeLessThanOrEqual(16)
    }
  })

  it('점은 모두 폭 안, 위쪽 라벨 여백 아래, 축 위에 있다', () => {
    const layout = layoutDistribution(rankedStocks(BATTERY, 'today').ranked, 360)
    for (const dot of layout.dots) {
      expect(dot.x - dot.r).toBeGreaterThanOrEqual(0)
      expect(dot.x + dot.r).toBeLessThanOrEqual(360)
      expect(dot.y + dot.r).toBeLessThanOrEqual(layout.axisY)
      expect(dot.y - dot.r).toBeGreaterThanOrEqual(0)
    }
    expect(layout.height).toBeGreaterThan(layout.axisY)
  })

  it('0% 눈금이 항상 있고 범위가 모든 값을 덮는다', () => {
    const layout = layoutDistribution(rankedStocks(BATTERY, 'today').ranked, 720)
    expect(layout.ticks.map((t) => t.value)).toContain(0)
    expect(layout.lo).toBeLessThanOrEqual(-0.98)
    expect(layout.hi).toBeGreaterThanOrEqual(16.76)
    const xs = layout.ticks.map((t) => t.x)
    expect([...xs].sort((a, b) => a - b)).toEqual(xs)
  })

  it('82종목이 같은 값에 몰려도 겹치지 않는다', () => {
    const many = Array.from({ length: 82 }, (_, i) => stock(String(i), `종목${i}`, (i % 5) * 0.1, 1_000_000 + i * 50_000))
    const layout = layoutDistribution(rankedStocks(many, 'today').ranked, 720)
    expect(layout.dots).toHaveLength(82)
    expect(overlaps(layout.dots)).toBe(false)
    expect(layout.height).toBeLessThan(600)
  })

  it('라벨은 서로 겹치지 않고, 최대 상승과 시총 1위는 우선 붙는다', () => {
    const layout = layoutDistribution(rankedStocks(BATTERY, 'today').ranked, 720)
    const labeled = layout.dots.filter((d) => d.label)
    expect(labeled.map((d) => d.ticker)).toEqual(expect.arrayContaining(['457190', '009150']))
    const boxes = labeled.map((d) => {
      const w = labelWidth(d.name)
      return { left: d.labelX - w / 2, right: d.labelX + w / 2, top: d.labelY - 12, bottom: d.labelY }
    })
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]
        const b = boxes[j]
        const hit = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
        expect(hit).toBe(false)
      }
    }
  })

  it('선택한 종목 라벨을 더해도 라벨끼리 겹치지 않고 선택 종목은 반드시 보인다', () => {
    const crowd = [
      stock('A', '대장종목', 10, 1_000_000),
      stock('D', '큰하락', -12, 900_000),
      stock('E', '중간하락', -11, 800_000),
      stock('G', '세번째하락', -10.5, 700_000),
      stock('B', '바로옆종목', 9.0, 10_000),
    ]
    const layout = layoutDistribution(rankedStocks(crowd, 'today').ranked, 720)
    expect(layout.dots.find((d) => d.ticker === 'B')!.label).toBe(false)
    const labels = renderedLabels(layout, 'B', 720)
    expect(labels.map((l) => l.ticker)).toContain('B')
    const boxes = labels.map((l) => {
      const w = labelWidth(l.name)
      return { left: l.x - w / 2, right: l.x + w / 2, top: l.y - 12, bottom: l.y }
    })
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i]
        const b = boxes[j]
        expect(a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom).toBe(false)
      }
    }
  })

  it('선택한 종목이 이미 라벨이면 기존 라벨 그대로', () => {
    const layout = layoutDistribution(rankedStocks(BATTERY, 'today').ranked, 720)
    const base = layout.dots.filter((d) => d.label).map((d) => d.ticker).sort()
    expect(renderedLabels(layout, '457190', 720).map((l) => l.ticker).sort()).toEqual(base)
    expect(renderedLabels(layout, null, 720).map((l) => l.ticker).sort()).toEqual(base)
  })

  it('종목이 없으면 점도 없다', () => {
    const layout = layoutDistribution([], 720)
    expect(layout.dots).toEqual([])
    expect(layout.ticks.map((t) => t.value)).toContain(0)
  })
})

function indexDays(count: number, end = '2026-09-30'): string[] {
  const days: string[] = []
  const d = new Date(`${end}T00:00:00Z`)
  while (days.length < count) {
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) days.unshift(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() - 1)
  }
  return days
}

function indexCandles(count: number, overrides: Record<string, { close?: number; tradeValue?: number | null }> = {}): ThemeIndexCandleRes[] {
  return indexDays(count).map((date) => {
    const o = overrides[date] ?? {}
    const close = o.close ?? 1000
    return { date, open: close, high: close, low: close, close, volume: 1000, tradeValue: o.tradeValue === undefined ? 1_000_000 : o.tradeValue }
  })
}

const news = (id: string, at: string): NewsDetail => ({ id, title: `뉴스 ${id}`, summary: '', url: '', collectedAt: at, tripleExtracted: true })

describe('themeMoves — 테마 지수 큰 움직임', () => {
  it('지수가 없으면 빈 목록', () => {
    expect(themeMoves([], [])).toEqual([])
    expect(NO_THEME_INDEX_TEXT).toBe('테마 지수가 아직 쌓이지 않았습니다')
    expect(NO_THEME_MOVES_TEXT).toBe('최근 60거래일 동안 테마 지수의 큰 움직임이 없었습니다')
  })

  it('±3% 경계와 거래대금 평소 2배 경계', () => {
    const days = indexDays(70)
    const candles = indexCandles(70, {
      [days[66]]: { close: 1030 },
      [days[67]]: { close: 1030 * 1.0299 },
      [days[68]]: { close: 1000 },
      [days[69]]: { close: 1000, tradeValue: 2_000_000 },
    })
    const moves = themeMoves(candles, [])
    expect(moves.map((m) => m.date)).toEqual([days[69], days[68], days[66]])
    expect(moves[0].valueRatio).toBeCloseTo(2)
    expect(moves[2].change).toBeCloseTo(3)
  })

  it('최근 60거래일만, 최대 20건, 최신순', () => {
    const days = indexDays(120)
    const overrides: Record<string, { close: number }> = {}
    days.forEach((date, i) => {
      overrides[date] = { close: i % 2 === 0 ? 1000 : 1100 }
    })
    const moves = themeMoves(indexCandles(120, overrides), [])
    expect(moves).toHaveLength(THEME_MOVE_LIMIT)
    expect(moves[0].date).toBe(days[119])
    expect(moves.every((m) => m.date >= days[60])).toBe(true)
  })

  it('그날 뉴스를 붙인다(주말 뉴스는 다음 거래일)', () => {
    const candles = indexCandles(30, { '2026-09-28': { close: 1100 } })
    const moves = themeMoves(candles, [news('n1', '2026-09-27T03:00:00Z'), news('n2', '2026-09-28T01:00:00Z'), news('n3', '2026-09-30T01:00:00Z')])
    const sep28 = moves.find((m) => m.date === '2026-09-28')!
    expect(sep28.news.map((n) => n.id)).toEqual(['n1', 'n2'])
  })

  it('거래대금이 비면 배수는 null', () => {
    const days = indexDays(30)
    const moves = themeMoves(indexCandles(30, { [days[29]]: { close: 1100, tradeValue: null } }), [])
    expect(moves[0].valueRatio).toBeNull()
  })
})
