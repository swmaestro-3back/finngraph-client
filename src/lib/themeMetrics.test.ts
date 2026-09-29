import { describe, expect, it } from 'vitest'
import type { ThemeRes } from '@/lib/apiTypes'
import {
  breadthLabel,
  changeStatusTag,
  excludedFromMeanLabel,
  sourceTitle,
  trimmedTickers,
  compareNullLast,
  countLabel,
  coverageBanner,
  describeTrim,
  hasThemeMetricsV2,
  hotExclusionTitle,
  isUnderCounted,
  leadStock,
  leaderCellContent,
  leaderColumnLabel,
  metricCaption,
  sensitivityLabel,
  sourceLabel,
  tileDetail,
  tileDetailPlacement,
  tileLabel,
  turnoverFact,
  turnoverMultiple,
} from '@/lib/themeMetrics'

const base: ThemeRes = {
  id: 1,
  name: '캔서문샷',
  description: null,
  change: 3.1,
  tradingValue: null,
  w1: null,
  m1: null,
  m3: null,
  marketCap: null,
  stockCount: 12,
  topStocks: [],
}

describe('describeTrim', () => {
  it('5종목 이상은 상·하위 k종목 제외 문구', () => {
    expect(describeTrim(12, 1)).toBe('12종목 중 상·하위 1종목씩 제외한 평균')
    expect(describeTrim(21, 3)).toBe('21종목 중 상·하위 3종목씩 제외한 평균')
  })

  it('3·4종목은 중앙값', () => {
    expect(describeTrim(3, 1)).toBe('3종목 중앙값')
    expect(describeTrim(4, 1)).toBe('4종목 중앙값')
  })

  it('3종목 미만은 종목 수 부족', () => {
    expect(describeTrim(2, 0)).toBe('종목 수 부족(2종목)')
    expect(describeTrim(0, 0)).toBe('종목 수 부족(0종목)')
  })
})

describe('breadthLabel · countLabel', () => {
  it('▲ · ▼ 순서', () => {
    expect(breadthLabel(11, 0, 1)).toBe('▲11 ·0 ▼1')
  })

  it('집계 수가 전체와 같으면 한 숫자, 다르면 분수', () => {
    expect(countLabel(12, 12)).toBe('12종목')
    expect(countLabel(10, 12)).toBe('10/12종목')
  })
})

describe('핫 후보 여부', () => {
  it('5종목 미만이면 부족', () => {
    expect(isUnderCounted(4, 4)).toBe(true)
    expect(isUnderCounted(5, 5)).toBe(false)
  })

  it('결손 30% 초과면 부족 (경계 30%는 통과)', () => {
    expect(isUnderCounted(7, 10)).toBe(false)
    expect(isUnderCounted(6, 10)).toBe(true)
    expect(isUnderCounted(5, 8)).toBe(true)
  })

  it('hotSide 가 있으면 제목 없음, 구 응답(pricedCount 없음)도 없음', () => {
    expect(hotExclusionTitle({ ...base, pricedCount: 4, hotSide: 'UP' })).toBeNull()
    expect(hotExclusionTitle(base)).toBeNull()
    expect(hotExclusionTitle({ ...base, pricedCount: 4, hotSide: null })).toBe(
      '집계 종목 부족 · 핫 테마 제외',
    )
    expect(hotExclusionTitle({ ...base, pricedCount: 12, hotSide: null })).toBeNull()
  })
})

describe('캡션 · 타일 문구', () => {
  const theme: ThemeRes = {
    ...base,
    baseDate: '2026-09-26',
    pricedCount: 12,
    upCount: 11,
    downCount: 1,
    flatCount: 0,
    trimCount: 1,
    meanChange: 9.03,
    sensitivity: 2.81,
    leaders: [{ ticker: '328130', name: '루닛', change: 13.8 }],
  }

  it('감도 1%p 이상일 때만 문구', () => {
    expect(sensitivityLabel(0.9)).toBeNull()
    expect(sensitivityLabel(null)).toBeNull()
    expect(sensitivityLabel(2.81)).toBe('한 종목 제외 시 최대 ±2.8%p')
  })

  it('metricCaption 은 절사 설명 · 단순평균 · 감도 순', () => {
    expect(metricCaption(theme)).toEqual([
      '12종목 중 상·하위 1종목씩 제외한 평균',
      '단순평균 +9.03%',
      '한 종목 제외 시 최대 ±2.8%p',
    ])
    expect(metricCaption(base)).toBeNull()
  })

  it('타일 3행과 aria-label', () => {
    expect(tileDetail(theme)).toBe('▲11 ▼1 · 루닛 +13.80%')
    expect(tileDetail(base)).toBeNull()
    expect(tileLabel(theme, '2026-09-26')).toBe(
      '캔서문샷 +3.10% · 집계 12/12 · ▲11 ·0 ▼1 · 9/26 종가',
    )
    expect(tileLabel(base, null)).toBe('캔서문샷 +3.10%')
  })

  it('배율은 타일 라벨에 들어가지 않는다', () => {
    expect(tileLabel({ ...theme, tradingValueRatio: 3.2456 }, '2026-09-26')).toBe(
      '캔서문샷 +3.10% · 집계 12/12 · ▲11 ·0 ▼1 · 9/26 종가',
    )
  })
})

describe('거래대금 배율 문구', () => {
  it('소수 1자리로 반올림하고 없으면 null', () => {
    expect(turnoverMultiple(3.24)).toBe('3.2배')
    expect(turnoverMultiple(3.25)).toBe('3.3배')
    expect(turnoverMultiple(0.96)).toBe('1.0배')
    expect(turnoverMultiple(0)).toBe('0.0배')
    expect(turnoverMultiple(null)).toBeNull()
    expect(turnoverMultiple(undefined)).toBeNull()
  })

  it('요약 카드 Fact 는 2배 이상만 강조한다', () => {
    expect(turnoverFact(3.2)).toEqual({ multiple: '20일 평균의 3.2배', emphasized: true })
    expect(turnoverFact(2)).toEqual({ multiple: '20일 평균의 2.0배', emphasized: true })
    expect(turnoverFact(1.96)).toEqual({ multiple: '20일 평균의 2.0배', emphasized: false })
    expect(turnoverFact(0.8)).toEqual({ multiple: '20일 평균의 0.8배', emphasized: false })
    expect(turnoverFact(null)).toBeNull()
  })

  it('출처 칩', () => {
    expect(sourceLabel(['naver', 'judal'])).toBe('네이버 · 주달')
    expect(sourceLabel([])).toBeNull()
    expect(sourceLabel(undefined)).toBeNull()
  })
})

describe('주도주 표시', () => {
  const topStocks = [
    { ticker: '000001', name: '피델릭스' },
    { ticker: '000002', name: '골든센츄리' },
  ]
  const leaders = [
    { ticker: '328130', name: '루닛', change: 13.8 },
    { ticker: '028300', name: 'HLB', change: 9.2 },
    { ticker: '000003', name: '셋째', change: 1.1 },
  ]

  it('leaders 가 없는 구 응답은 대표 종목 이름을 폴백으로 쓴다', () => {
    expect(leaderCellContent(undefined, topStocks)).toEqual({
      kind: 'legacy',
      text: '피델릭스 · 골든센츄리',
    })
    expect(leaderCellContent(undefined, [])).toEqual({ kind: 'empty' })
  })

  it('leaders 가 빈 배열이거나 등락률이 없으면 시총 상위로 대체하지 않고 비운다', () => {
    expect(leaderCellContent([], topStocks)).toEqual({ kind: 'empty' })
    expect(
      leaderCellContent([{ ticker: '000001', name: '피델릭스', change: null }], topStocks),
    ).toEqual({ kind: 'empty' })
  })

  it('leaders 는 최대 2개', () => {
    expect(leaderCellContent(leaders, topStocks)).toEqual({
      kind: 'leaders',
      leaders: leaders.slice(0, 2),
    })
  })

  it('열 라벨은 leaders 필드가 하나라도 있으면 주도주, 없으면 대표 종목', () => {
    expect(leaderColumnLabel([{ leaders: [] }, {}])).toBe('주도주')
    expect(leaderColumnLabel([{}, {}])).toBe('대표 종목')
    expect(leaderColumnLabel([])).toBe('대표 종목')
  })

  it('leadStock 은 leaders 우선, 빈 배열이면 null, 없으면 대표 종목', () => {
    expect(leadStock({ leaders, topStocks })).toEqual({
      kind: 'leader',
      name: '루닛',
      change: 13.8,
    })
    expect(leadStock({ leaders: [], topStocks })).toBeNull()
    expect(
      leadStock({ leaders: [{ ticker: '000001', name: '피델릭스', change: null }], topStocks }),
    ).toBeNull()
    expect(leadStock({ topStocks })).toEqual({ kind: 'representative', name: '피델릭스' })
    expect(leadStock({ topStocks: [] })).toBeNull()
  })
})

describe('hasThemeMetricsV2', () => {
  it('market 응답이 있거나 pricedCount 가 하나라도 있으면 v2', () => {
    expect(hasThemeMetricsV2({ baseDate: '2026-09-26' }, [base])).toBe(true)
    expect(hasThemeMetricsV2(null, [base, { ...base, pricedCount: 3 }])).toBe(true)
  })

  it('둘 다 없으면 구 백엔드', () => {
    expect(hasThemeMetricsV2(null, [base])).toBe(false)
    expect(hasThemeMetricsV2(null, null)).toBe(false)
    expect(hasThemeMetricsV2(undefined, [])).toBe(false)
  })
})

describe('coverageBanner', () => {
  it('coverage 0.8 미만이면 반영률 포함 배너', () => {
    expect(coverageBanner(0.192, 10)).toBe(
      '시세 적재가 끝나지 않아 핫 테마를 잠시 비워 둡니다 (19% 종목 반영)',
    )
  })

  it('핫 목록이 비면 coverage 없이도 배너', () => {
    expect(coverageBanner(null, 0)).toBe('시세 적재가 끝나지 않아 핫 테마를 잠시 비워 둡니다')
  })

  it('정상이면 없음', () => {
    expect(coverageBanner(0.95, 10)).toBeNull()
    expect(coverageBanner(null, null)).toBeNull()
  })
})

describe('changeStatusTag', () => {
  it('상태별 라벨', () => {
    expect(changeStatusTag('TRIMMED')?.label).toBe('평균 제외')
    expect(changeStatusTag('SUSPENDED')?.label).toBe('거래정지')
    expect(changeStatusTag('DELISTING')?.label).toBe('정리매매')
    expect(changeStatusTag('NO_CANDLE')?.label).toBe('시세 없음')
    expect(changeStatusTag('NO_PREV')?.label).toBe('시세 없음')
    expect(changeStatusTag('PRICED')).toBeNull()
    expect(changeStatusTag(undefined)).toBeNull()
  })

  it('평균 제외 종목만 등락률 표시를 유지하고 모든 태그는 설명을 가진다', () => {
    expect(changeStatusTag('TRIMMED')?.keepsChange).toBe(true)
    expect(changeStatusTag('SUSPENDED')?.keepsChange).toBe(false)
    expect(changeStatusTag('NO_PREV')?.keepsChange).toBe(false)
    for (const status of ['TRIMMED', 'SUSPENDED', 'DELISTING', 'NO_CANDLE'] as const) {
      expect(changeStatusTag(status)?.title.length).toBeGreaterThan(10)
    }
  })

  it('평균 제외 종목 집합과 개수 문구를 만든다', () => {
    const stocks = [
      { ticker: '1', changeStatus: 'TRIMMED' as const },
      { ticker: '2', changeStatus: 'PRICED' as const },
      { ticker: '3', changeStatus: 'TRIMMED' as const },
      { ticker: '4', changeStatus: undefined },
    ]
    expect([...trimmedTickers(stocks)]).toEqual(['1', '3'])
    expect(excludedFromMeanLabel(2)).toBe('평균 계산 제외 2')
    expect(excludedFromMeanLabel(0)).toBeNull()
  })

  it('출처 툴팁은 전체 이름을 쓴다', () => {
    expect(sourceTitle(['naver', 'judal'])).toBe('테마 구성 출처: 네이버 금융 테마, 주달 테마')
    expect(sourceTitle(['etc'])).toBe('테마 구성 출처: etc')
    expect(sourceTitle([])).toBeNull()
  })
})

describe('compareNullLast', () => {
  it('null 은 오름·내림 어느 쪽이든 맨 뒤', () => {
    const rows = [3, null, 1, 2]
    expect([...rows].sort((a, b) => compareNullLast(a, b, true))).toEqual([3, 2, 1, null])
    expect([...rows].sort((a, b) => compareNullLast(a, b, false))).toEqual([1, 2, 3, null])
  })

  it('문자열은 한국어 로캘 비교, undefined·NaN 도 결손 취급', () => {
    const rows = ['나', undefined, '가', Number.NaN]
    const sorted = [...rows].sort((a, b) => compareNullLast(a, b, false))
    expect(sorted.slice(0, 2)).toEqual(['가', '나'])
    expect(compareNullLast(Number.NaN, 1, true)).toBe(1)
    expect(compareNullLast(1, undefined, false)).toBe(-1)
  })
})

describe('tileDetailPlacement', () => {
  it('세 줄이 들어가면 별도 줄로 둔다', () => {
    expect(tileDetailPlacement(114, 83, '+3.07%', '▲4 ▼1')).toBe('line')
    expect(tileDetailPlacement(60, 83, '+3.07%', '▲25 ▼5')).toBe('line')
  })

  it('높이가 모자라도 폭이 되면 등락률 옆 같은 줄에 붙인다', () => {
    expect(tileDetailPlacement(200, 71, '−2.30%', '▲4 ▼1')).toBe('inline')
    expect(tileDetailPlacement(143, 55, '−2.30%', '▲2 ▼9')).toBe('inline')
  })

  it('폭이 모자라면 넣지 않는다', () => {
    expect(tileDetailPlacement(40, 83, '+3.07%', '▲25 ▼5')).toBe('none')
    expect(tileDetailPlacement(80, 55, '−2.30%', '▲2 ▼9')).toBe('none')
    expect(tileDetailPlacement(114, 83, '+3.07%', '▲6 ▼1 · 삼성전자 +3.20%')).toBe('none')
  })

  it('등락률 줄조차 없는 아주 작은 타일과 빈 줄은 넣지 않는다', () => {
    expect(tileDetailPlacement(200, 30, '−2.30%', '▲4 ▼1')).toBe('none')
    expect(tileDetailPlacement(200, 100, '+3.07%', '')).toBe('none')
  })
})
