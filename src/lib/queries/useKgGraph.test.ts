import { describe, expect, it } from 'vitest'
import { kgGraphKey, kgGraphRequest } from '@/lib/queries/useKgGraph'
import type { GraphQuery } from '@/lib/graphRoute'

const q = (patch: Partial<GraphQuery>): GraphQuery => ({ hop: 1, scope: 'all', lens: 'overview', ...patch })
const company = { kind: 'company' as const, ticker: '005930' }

describe('kgGraphRequest', () => {
  it('개요·테마 렌즈는 hop·범위가 바뀌어도 같은 키다', () => {
    for (const lens of ['overview', 'themes'] as const) {
      const a = kgGraphKey(kgGraphRequest(company, q({ lens, hop: 1 })))
      const b = kgGraphKey(kgGraphRequest(company, q({ lens, hop: 3, scope: 'KOSPI' })))
      expect(a).toBe(b)
    }
  })

  it('테마 원점은 렌즈·hop·범위와 무관하다', () => {
    const theme = { kind: 'theme' as const, name: '2차전지/소재' }
    const req = kgGraphRequest(theme, q({ lens: 'supply', hop: 3 }))
    expect(req).toEqual({ path: '/v1/themes/2%EC%B0%A8%EC%A0%84%EC%A7%80%2F%EC%86%8C%EC%9E%AC', params: {} })
  })

  it('공급망은 hop과 범위를, 이벤트는 hop만 보낸다', () => {
    expect(kgGraphRequest(company, q({ lens: 'supply', hop: 2, scope: 'KOSDAQ' }))).toEqual({
      path: '/v1/companies/005930/supplychain', params: { hop: 2, market: 'KOSDAQ' },
    })
    expect(kgGraphRequest(company, q({ lens: 'events', hop: 3, scope: 'KOSDAQ' }))).toEqual({
      path: '/v1/companies/005930/events', params: { hop: 3 },
    })
    expect(kgGraphKey(kgGraphRequest(company, q({ lens: 'supply', hop: 2 })))).toBe(
      '/v1/companies/005930/supplychain?hop=2',
    )
  })
})
