import { describe, expect, it } from 'vitest'
import { pathLabel, resolveBackTarget } from '@/lib/navigation'

describe('pathLabel', () => {
  it('테마 목록은 테마, 테마 상세는 테마 상세', () => {
    expect(pathLabel('/themes')).toBe('테마')
    expect(pathLabel('/themes/59')).toBe('테마 상세')
    expect(pathLabel('/theme/59')).toBe('테마 상세')
  })

  it('종목 목록·상세·뉴스·관계 탐색 화면도 이름을 안다', () => {
    expect(pathLabel('/stocks')).toBe('종목')
    expect(pathLabel('/stocks/096770')).toBe('이전 종목')
    expect(pathLabel('/news')).toBe('뉴스')
    expect(pathLabel('/news/1234')).toBe('뉴스')
    expect(pathLabel('/graph')).toBe('관계 탐색')
    expect(pathLabel('/graph/096770')).toBe('관계 탐색')
    expect(pathLabel(`/graph/theme/${encodeURIComponent('정유')}`)).toBe('관계 탐색')
  })

  it('다른 경로 라벨은 그대로', () => {
    expect(pathLabel('/')).toBe('테마 대시보드')
    expect(pathLabel('/calendar')).toBe('캘린더')
    expect(pathLabel('/stock/005930')).toBe('주식 상세')
    expect(pathLabel('/briefing')).toBeNull()
    expect(pathLabel('/newsroom')).toBeNull()
    expect(pathLabel('/graphs')).toBeNull()
  })
})

describe('resolveBackTarget', () => {
  const fallback = { to: '/themes?id=1016', label: '테마' }

  it('state.from이 아는 화면이면 그 화면으로 돌아가고 라벨도 그 화면 이름이다', () => {
    expect(resolveBackTarget({ from: '/stocks/096770' }, fallback)).toEqual({ to: '/stocks/096770', label: '이전 종목' })
    expect(resolveBackTarget({ from: '/news?tab=all' }, fallback)).toEqual({ to: '/news?tab=all', label: '뉴스' })
    expect(resolveBackTarget({ from: '/graph/theme/%EC%A0%95%EC%9C%A0' }, fallback)).toEqual({
      to: '/graph/theme/%EC%A0%95%EC%9C%A0',
      label: '관계 탐색',
    })
    expect(resolveBackTarget({ from: '/themes?id=35&view=table' }, fallback)).toEqual({
      to: '/themes?id=35&view=table',
      label: '테마',
    })
  })

  it('종목에서 종목으로 왔으면 이전 종목, 목록에서 왔으면 종목으로 돌아간다', () => {
    const stockFallback = { to: '/stocks?code=000660', label: '종목' }
    expect(resolveBackTarget({ from: '/stocks/005930?tab=finance' }, stockFallback)).toEqual({
      to: '/stocks/005930?tab=finance',
      label: '이전 종목',
    })
    expect(resolveBackTarget({ from: '/stocks?code=000660&page=2' }, stockFallback)).toEqual({
      to: '/stocks?code=000660&page=2',
      label: '종목',
    })
    expect(resolveBackTarget(null, stockFallback)).toEqual(stockFallback)
  })

  it('state가 없거나 모르는 화면이면 기본값으로 간다', () => {
    expect(resolveBackTarget(null, fallback)).toBe(fallback)
    expect(resolveBackTarget({ from: 3 }, fallback)).toBe(fallback)
    expect(resolveBackTarget({ from: '/briefing' }, fallback)).toBe(fallback)
  })
})
