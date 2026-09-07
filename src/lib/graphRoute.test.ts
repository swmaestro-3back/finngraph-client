import { describe, expect, it } from 'vitest'
import {
  DEFAULT_GRAPH_QUERY,
  graphPath,
  graphSearch,
  lensControls,
  lensDefaultCategories,
  parseGraphQuery,
} from '@/lib/graphRoute'

describe('graphRoute', () => {
  it('빈 쿼리는 기본값(hop 1, 전체, 개요)', () => {
    expect(parseGraphQuery(new URLSearchParams(''))).toEqual(DEFAULT_GRAPH_QUERY)
    expect(DEFAULT_GRAPH_QUERY).toEqual({ hop: 1, scope: 'all', lens: 'overview' })
  })

  it('기본값은 직렬화에서 생략된다', () => {
    expect(graphSearch(DEFAULT_GRAPH_QUERY)).toBe('')
  })

  it('렌즈는 supply·events만 적고 왕복한다', () => {
    const q = { hop: 2 as const, scope: 'KOSPI' as const, lens: 'supply' as const }
    const s = graphSearch(q)
    expect(s).toBe('?lens=supply&hop=2&market=KOSPI')
    expect(parseGraphQuery(new URLSearchParams(s))).toEqual(q)
    expect(graphSearch({ ...DEFAULT_GRAPH_QUERY, lens: 'events' })).toBe('?lens=events')
  })

  it('모르는 렌즈 값은 개요로 떨어진다', () => {
    expect(parseGraphQuery(new URLSearchParams('lens=banana')).lens).toBe('overview')
  })

  it('경로에도 렌즈가 실린다', () => {
    expect(graphPath({ kind: 'company', ticker: '005930' }, { ...DEFAULT_GRAPH_QUERY, lens: 'events' })).toBe(
      '/graph/005930?lens=events',
    )
    expect(graphPath({ kind: 'theme', name: '밸류업' })).toBe('/graph/theme/%EB%B0%B8%EB%A5%98%EC%97%85')
  })

  it('렌즈별 컨트롤 노출', () => {
    expect(lensControls('overview')).toEqual({ hop: false, scope: false })
    expect(lensControls('supply')).toEqual({ hop: true, scope: true })
    expect(lensControls('events')).toEqual({ hop: true, scope: false })
  })

  it('개요만 테마를 기본으로 숨긴다', () => {
    expect([...lensDefaultCategories('overview')]).toEqual(['kospi', 'kosdaq', 'event'])
    expect([...lensDefaultCategories('supply')]).toEqual(['kospi', 'kosdaq', 'theme', 'event'])
    expect([...lensDefaultCategories('events')]).toEqual(['kospi', 'kosdaq', 'theme', 'event'])
  })
})
