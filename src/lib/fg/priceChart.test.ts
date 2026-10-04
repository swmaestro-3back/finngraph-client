import { describe, expect, it } from 'vitest'
import type { CandleRes } from '@/lib/apiTypes'
import {
  chartValueText,
  followSpan,
  formatChartVolume,
  isAway,
  isoOfTime,
  keyboardIndex,
  legendAt,
  periodSpan,
  revealSpan,
  RIGHT_OFFSET,
  spanMoved,
  tickLabel,
  volumeRatio,
  withAlpha,
  zoomSpan,
} from '@/lib/fg/priceChart'

function bar(date: string, open: number, close: number, volume = 1000): CandleRes {
  return { date, open, high: Math.max(open, close) + 100, low: Math.min(open, close) - 100, close, volume }
}

describe('periodSpan', () => {
  const dates = ['2025-09-30', '2025-10-01', '2026-03-31', '2026-07-01', '2026-08-31', '2026-09-01', '2026-09-30']

  it('기간 경계 다음 거래일부터 마지막 봉 뒤 여백까지를 논리 범위로(52주와 같은 경계)', () => {
    expect(periodSpan(dates, '1m')).toEqual({ from: 3.5, to: 6.5 + RIGHT_OFFSET })
    expect(periodSpan(dates, '3m')).toEqual({ from: 2.5, to: 6.5 + RIGHT_OFFSET })
    expect(periodSpan(dates, '6m')).toEqual({ from: 1.5, to: 6.5 + RIGHT_OFFSET })
    expect(periodSpan(dates, '1y')).toEqual({ from: 0.5, to: 6.5 + RIGHT_OFFSET })
  })

  it('봉이 없으면 빈 범위', () => {
    expect(periodSpan([], '3m')).toEqual({ from: -0.5, to: -0.5 + RIGHT_OFFSET })
  })
})

describe('범위 판정', () => {
  it('기간 버튼으로 맞춘 범위에서 한 봉 넘게 움직이면 선택을 푼다', () => {
    expect(spanMoved({ from: 10, to: 40 }, { from: 10.6, to: 40.9 })).toBe(false)
    expect(spanMoved({ from: 10, to: 40 }, { from: 11.2, to: 40 })).toBe(true)
    expect(spanMoved({ from: 10, to: 40 }, { from: 10, to: 38.5 })).toBe(true)
  })

  it('마지막 봉이 화면 밖이면 최근으로 버튼을 보인다', () => {
    expect(isAway({ from: 0, to: 99 }, 100)).toBe(false)
    expect(isAway({ from: 0, to: 98.4 }, 100)).toBe(true)
  })

  it('확대·축소는 기준점을 두고 양쪽을 같은 배율로', () => {
    expect(zoomSpan({ from: 0, to: 100 }, 100, 0.8)).toEqual({ from: 20, to: 100 })
    expect(zoomSpan({ from: 20, to: 60 }, 40, 1.25)).toEqual({ from: 15, to: 65 })
  })

  it('고른 이슈가 화면 밖이면 폭을 유지한 채 그 날을 60% 지점에 둔다', () => {
    expect(revealSpan({ from: 50, to: 100 }, 70)).toBeNull()
    expect(revealSpan({ from: 100, to: 150 }, 70)).toEqual({ from: 40, to: 90 })
    expect(revealSpan({ from: 50, to: 100 }, 10)).toEqual({ from: -0.5, to: 49.5 })
  })

  it('키보드로 고른 날이 화면 밖이면 그만큼만 옮긴다', () => {
    expect(followSpan({ from: 50, to: 100 }, 70)).toBeNull()
    expect(followSpan({ from: 50, to: 100 }, 40)).toEqual({ from: 39, to: 89 })
    expect(followSpan({ from: 50, to: 100 }, 120)).toEqual({ from: 72, to: 122 })
  })
})

describe('keyboardIndex', () => {
  it('처음 누르면 마지막 봉에서 시작하고 Shift는 다섯 칸', () => {
    expect(keyboardIndex('ArrowLeft', false, null, 10)).toBe(9)
    expect(keyboardIndex('ArrowRight', false, null, 10)).toBe(9)
    expect(keyboardIndex('ArrowLeft', true, 9, 10)).toBe(4)
    expect(keyboardIndex('ArrowLeft', true, 2, 10)).toBe(0)
    expect(keyboardIndex('ArrowRight', true, 7, 10)).toBe(9)
  })

  it('Home·End는 처음과 끝, 다른 키는 null', () => {
    expect(keyboardIndex('Home', false, 5, 10)).toBe(0)
    expect(keyboardIndex('End', false, 5, 10)).toBe(9)
    expect(keyboardIndex('a', false, 5, 10)).toBeNull()
    expect(keyboardIndex('End', false, null, 0)).toBeNull()
  })
})

describe('값 줄', () => {
  const candles = [bar('2026-09-29', 70000, 71200, 3_200_000), bar('2026-09-30', 71500, 72400, 4_712_000)]

  it('날짜·시고저종·전 거래일 대비 등락률·거래량', () => {
    expect(legendAt(candles, 1)).toEqual({
      date: '9월 30일(수)',
      open: '71,500',
      high: '72,500',
      low: '71,400',
      close: '72,400',
      change: (72400 / 71200 - 1) * 100,
      volume: '471만',
    })
  })

  it('첫 봉은 등락률이 없고, 범위 밖은 null', () => {
    expect(legendAt(candles, 0)?.change).toBeNull()
    expect(legendAt(candles, 5)).toBeNull()
  })

  it('해가 다른 날은 연도를 붙인다', () => {
    expect(legendAt([bar('2025-12-03', 1, 1), ...candles], 0)?.date).toBe('2025년 12월 3일(수)')
  })

  it('스크린리더 값은 원·주 단위를 붙이고 이슈가 있으면 덧붙인다', () => {
    expect(chartValueText(candles, 1, null)).toBe(
      '9월 30일(수), 시가 71,500원, 고가 72,500원, 저가 71,400원, 종가 72,400원, +1.69%, 거래량 471만주',
    )
    expect(chartValueText(candles, 1, '수출 규제')).toMatch(/, 이슈: 수출 규제$/)
    expect(chartValueText([], 0, null)).toBe('')
  })

  it('마커가 뉴스면 뉴스로 읽는다', () => {
    expect(chartValueText(candles, 1, '반도체 수출 늘어', '뉴스')).toMatch(/, 뉴스: 반도체 수출 늘어$/)
    expect(chartValueText(candles, 1, '반도체 수출 늘어', '뉴스')).not.toMatch(/이슈/)
    expect(chartValueText(candles, 1, '수출 규제', '이슈')).toMatch(/, 이슈: 수출 규제$/)
  })
})

describe('formatChartVolume', () => {
  it('억·만 단위로 줄인다', () => {
    expect(formatChartVolume(312_000_000)).toBe('3.1억')
    expect(formatChartVolume(4_712_000)).toBe('471만')
    expect(formatChartVolume(9_800)).toBe('9,800')
  })
})

describe('시간축', () => {
  it('연 경계는 연도, 월 경계는 월, 나머지는 일', () => {
    expect(tickLabel('2026-01-02', 'year')).toBe('2026')
    expect(tickLabel('2026-10-01', 'month')).toBe('10월')
    expect(tickLabel('2026-10-14', 'day')).toBe('14')
  })

  it('라이브러리 시간 값을 날짜 문자열로', () => {
    expect(isoOfTime('2026-09-30')).toBe('2026-09-30')
    expect(isoOfTime({ year: 2026, month: 9, day: 3 })).toBe('2026-09-03')
    expect(isoOfTime(Date.UTC(2026, 8, 30) / 1000)).toBe('2026-09-30')
  })
})

describe('withAlpha', () => {
  it('토큰 hex에 불투명도를 입힌다', () => {
    expect(withAlpha('#d92b35', 0.32)).toBe('rgba(217, 43, 53, 0.32)')
    expect(withAlpha(' #fff ', 0.5)).toBe('rgba(255, 255, 255, 0.5)')
  })

  it('hex가 아니면 그대로 둔다', () => {
    expect(withAlpha('rgb(1, 2, 3)', 0.5)).toBe('rgb(1, 2, 3)')
  })
})

describe('volumeRatio', () => {
  it('그날 거래량 ÷ 직전 거래일들 평균(최대 20일, 그날 제외)', () => {
    const candles = [bar('2026-09-24', 1, 1, 100), bar('2026-09-25', 1, 1, 300), bar('2026-09-26', 1, 1, 400)]
    expect(volumeRatio(candles, 2)).toBe(2)
    expect(volumeRatio(candles, 0)).toBeNull()
  })
})
