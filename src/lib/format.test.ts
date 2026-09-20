import { describe, expect, it } from 'vitest'
import { formatDateTime, formatTrillion, pressOf } from '@/lib/format'

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

describe('pressOf — 수집 뉴스 도메인은 언론사 이름으로', () => {
  it('네이버 뉴스와 이투데이·아주경제 도메인을 안다', () => {
    expect(pressOf('https://n.news.naver.com/mnews/article/366/0001193190')).toBe('네이버 뉴스')
    expect(pressOf('https://www.etoday.co.kr/news/view/1')).toBe('이투데이')
    expect(pressOf('https://www.ajunews.com/view/1')).toBe('아주경제')
  })
})
