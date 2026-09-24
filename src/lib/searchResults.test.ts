import { describe, expect, it } from 'vitest'
import { searchResults } from '@/lib/searchResults'

const stocks = [
  { ticker: '005935', name: '삼성전자우', market: 'KOSPI' },
  { ticker: '005930', name: '삼성전자', market: 'KOSPI' },
  { ticker: '028050', name: '삼성E&A', market: 'KOSPI' },
  { ticker: '000660', name: 'SK하이닉스', market: 'KOSPI' },
  { ticker: '035420', name: 'NAVER', market: 'KOSPI' },
  { ticker: '403870', name: 'HPSP', market: 'KOSDAQ' },
]
const themes = [{ name: '반도체' }, { name: '삼성 밸류체인' }, { name: '2차전지' }]

describe('searchResults', () => {
  it('빈 검색어는 빈 결과', () => {
    expect(searchResults('   ', stocks, themes)).toEqual([])
  })

  it('이름·코드 부분 일치 종목과 이름 부분 일치 테마를 함께 돌려준다', () => {
    const keys = searchResults('삼성', stocks, themes).map((r) => r.key)
    expect(keys).toEqual([
      'company:005935',
      'company:005930',
      'company:028050',
      'theme:삼성 밸류체인',
    ])
  })

  it('이름 정확 일치 종목을 맨 앞에 둔다', () => {
    const keys = searchResults('삼성전자', stocks, themes).map((r) => r.key)
    expect(keys).toEqual(['company:005930', 'company:005935'])
  })

  it('코드 정확 일치도 맨 앞', () => {
    const keys = searchResults('005930', stocks, themes).map((r) => r.key)
    expect(keys[0]).toBe('company:005930')
  })

  it('대소문자를 무시한다', () => {
    expect(searchResults('naver', stocks, themes)[0]?.label).toBe('NAVER')
  })

  it('테마는 최대 3칸, 종목은 나머지 칸을 채운다', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      ticker: String(100000 + i),
      name: `테스트${i}`,
      market: 'KOSDAQ',
    }))
    const manyThemes = Array.from({ length: 5 }, (_, i) => ({ name: `테스트테마${i}` }))
    const results = searchResults('테스트', many, manyThemes)
    expect(results).toHaveLength(8)
    expect(results.filter((r) => r.category === 'theme')).toHaveLength(3)
  })

  it('종목·테마 행의 표기와 focus', () => {
    const [stock] = searchResults('HPSP', stocks, themes)
    expect(stock).toMatchObject({
      label: 'HPSP',
      meta: '403870',
      category: 'kosdaq',
      focus: { kind: 'company', ticker: '403870' },
    })
    const [theme] = searchResults('2차', stocks, themes)
    expect(theme).toMatchObject({
      label: '2차전지',
      meta: '테마',
      category: 'theme',
      focus: { kind: 'theme', name: '2차전지' },
    })
  })
})
