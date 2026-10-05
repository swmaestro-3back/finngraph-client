import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  formatCompactKrw,
  formatDateTime,
  formatShortDate,
  formatShortDateTime,
  formatSignedWon,
  formatTrillion,
  formatVolume,
  pressName,
} from '@/lib/format'

describe('formatCompactKrw — 원 금액을 조·억으로', () => {
  it('1조 이상은 소수 첫째 자리 조', () => {
    expect(formatCompactKrw(1.2e12)).toBe('1.2조')
    expect(formatCompactKrw(1e12)).toBe('1.0조')
    expect(formatCompactKrw(228.74e12)).toBe('228.7조')
    expect(formatCompactKrw(999.94e12)).toBe('999.9조')
  })

  it('1,000조 이상은 천 단위를 묶는다', () => {
    expect(formatCompactKrw(4791.3e12)).toBe('4,791.3조')
    expect(formatCompactKrw(1000e12)).toBe('1,000.0조')
  })

  it('1조 미만은 정수 억, null은 대시', () => {
    expect(formatCompactKrw(9820e8)).toBe('9,820억')
    expect(formatCompactKrw(5e8)).toBe('5억')
    expect(formatCompactKrw(1e8)).toBe('1억')
    expect(formatCompactKrw(null)).toBe('—')
  })

  it('1억 미만은 만 단위, 1만 미만은 "1만 미만", 0은 0', () => {
    expect(formatCompactKrw(2_200_000)).toBe('220만')
    expect(formatCompactKrw(49_990_000)).toBe('4,999만')
    expect(formatCompactKrw(10_000)).toBe('1만')
    expect(formatCompactKrw(9_999)).toBe('1만 미만')
    expect(formatCompactKrw(1)).toBe('1만 미만')
    expect(formatCompactKrw(0)).toBe('0')
  })

  it('반올림해서 윗단위가 되면 윗단위로 올린다', () => {
    expect(formatCompactKrw(99_995_000)).toBe('1억')
    expect(formatCompactKrw(999_960_000_000)).toBe('1.0조')
  })

  it('음수는 U+2212를 붙이고 양수와 같은 단위로 바꾼다', () => {
    expect(formatCompactKrw(-7_730_313_000_000)).toBe('−7.7조')
    expect(formatCompactKrw(-104_217_336_541)).toBe('−1,042억')
    expect(formatCompactKrw(-2_200_000)).toBe('−220만')
    expect(formatCompactKrw(-5_000)).toBe('1만 미만')
  })
})

describe('formatTrillion — 조 단위 숫자를 1조 기준으로 조/억 전환', () => {
  it('1조 이상은 소수 첫째 자리 조', () => {
    expect(formatTrillion(228.7)).toBe('228.7조')
    expect(formatTrillion(1)).toBe('1.0조')
    expect(formatTrillion(1.04)).toBe('1.0조')
  })

  it('1조 미만은 정수 억 (최대 4자리, 천 단위 구분)', () => {
    expect(formatTrillion(0.9999)).toBe('9,999억')
    expect(formatTrillion(0.0523)).toBe('523억')
    expect(formatTrillion(0.0001)).toBe('1억')
  })

  it('억으로 반올림했더니 1조가 되면 조로 올린다', () => {
    expect(formatTrillion(0.99996)).toBe('1.0조')
  })

  it('음수(적자)도 같은 규칙', () => {
    expect(formatTrillion(-0.3)).toBe('-3,000억')
    expect(formatTrillion(-2.35)).toBe('-2.4조')
  })

  it('0은 0억, null은 대시', () => {
    expect(formatTrillion(0)).toBe('0억')
    expect(formatTrillion(null)).toBe('-')
  })
})

describe('formatDateTime — 기사 입력 시각 "2026. 09. 18. 09:11"', () => {
  it('연. 월. 일. 시:분을 두 자리로 맞춘다', () => {
    expect(formatDateTime('2026-09-18T09:11:00+09:00')).toBe('2026. 09. 18. 09:11')
  })

  it('잘못된 값이면 빈 문자열', () => {
    expect(formatDateTime('')).toBe('')
    expect(formatDateTime('not-a-date')).toBe('')
  })
})

describe('formatSignedWon — 부호 있는 원 금액', () => {
  it('양수는 +, 음수는 U+2212, 0은 부호 없이', () => {
    expect(formatSignedWon(34_000)).toBe('+34,000원')
    expect(formatSignedWon(-1)).toBe('−1원')
    expect(formatSignedWon(0)).toBe('0원')
  })
})

describe('formatVolume — 주 단위 거래량을 만주로', () => {
  it('1만 주 이상은 만주로 반올림한다', () => {
    expect(formatVolume(26_804_038)).toBe('2,680만주')
    expect(formatVolume(706_184_719)).toBe('70,618만주')
    expect(formatVolume(10_000)).toBe('1만주')
    expect(formatVolume(14_999)).toBe('1만주')
  })

  it('1만 주 미만은 주 그대로', () => {
    expect(formatVolume(9_999)).toBe('9,999주')
    expect(formatVolume(0)).toBe('0주')
  })
})

describe('pressName — 기사 주소나 매체 호스트를 언론사 이름 하나로', () => {
  const NAMES = {
    'press-a.test': '예시경제',
    'news.press-b.test': '예시산업신문',
    'portal.test': '가상포털',
  }

  it('기사 주소에서 호스트를 읽어 이름을 찾아요', () => {
    expect(pressName('https://press-a.test/stock/2026/09/16/1', NAMES)).toBe('예시경제')
    expect(pressName('https://news.press-b.test/view/1?division=PORTAL', NAMES)).toBe('예시산업신문')
    expect(pressName('http://portal.test/article/366/1', NAMES)).toBe('가상포털')
  })

  it('www가 있든 없든 같은 이름이에요', () => {
    for (const source of ['https://www.press-a.test/view/1', 'https://press-a.test/view/1', 'www.press-a.test', 'press-a.test']) {
      expect(pressName(source, NAMES)).toBe('예시경제')
    }
    expect(pressName('https://www.news.press-b.test/1', NAMES)).toBe('예시산업신문')
  })

  it('대소문자와 앞뒤 공백은 가리지 않아요', () => {
    expect(pressName('HTTPS://WWW.PRESS-A.TEST/View/1', NAMES)).toBe('예시경제')
    expect(pressName('  Press-A.Test  ', NAMES)).toBe('예시경제')
  })

  it('사전에 없는 매체는 www를 뺀 도메인 그대로예요', () => {
    expect(pressName('https://www.press-c.test/a/1', NAMES)).toBe('press-c.test')
    expect(pressName('press-c.test', NAMES)).toBe('press-c.test')
    expect(pressName('https://sub.press-a.test/1', NAMES)).toBe('sub.press-a.test')
    expect(pressName('https://www.press-c.test/a/1')).toBe('press-c.test')
  })

  it('주소가 없거나 읽을 수 없으면 출처 미상이에요', () => {
    expect(pressName(null, NAMES)).toBe('출처 미상')
    expect(pressName(undefined, NAMES)).toBe('출처 미상')
    expect(pressName('', NAMES)).toBe('출처 미상')
    expect(pressName('   ', NAMES)).toBe('출처 미상')
    expect(pressName('not a url', NAMES)).toBe('출처 미상')
  })
})

describe('formatVolume — 주 단위 거래량을 만주/주로', () => {
  it('1만주 이상은 정수 만주', () => {
    expect(formatVolume(65_555_523)).toBe('6,556만주')
    expect(formatVolume(10_000)).toBe('1만주')
  })

  it('1만주 미만은 주 그대로', () => {
    expect(formatVolume(3_200)).toBe('3,200주')
    expect(formatVolume(0)).toBe('0주')
  })
})

describe('formatShortDate — 장부 행의 날짜 "08.24"', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-03T12:00:00+09:00'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('올해는 월.일, 다른 해는 연도 두 자리를 붙인다', () => {
    expect(formatShortDate('2026-08-24T10:00:00+09:00')).toBe('08.24')
    expect(formatShortDate('2025-11-03')).toBe('25.11.03')
  })

  it('시각이 있으면 붙이고 없으면 날짜만', () => {
    expect(formatShortDateTime('2026-09-29T13:56:00+09:00')).toBe('09.29 13:56')
    expect(formatShortDateTime('2026-09-29')).toBe('09.29')
  })

  it('없거나 잘못된 값이면 빈 문자열', () => {
    expect(formatShortDate(null)).toBe('')
    expect(formatShortDateTime('not-a-date')).toBe('')
  })
})
