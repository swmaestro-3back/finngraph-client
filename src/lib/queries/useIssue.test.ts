import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { loadArticleCompaniesMany } from '@/lib/queries/useIssue'

function company(name: string) {
  return { companyName: name, ticker: '000500', change: null }
}

function stubCompanies(failing: ReadonlySet<string>) {
  const fetchMock = vi.fn((input: string) => {
    const id = /\/v1\/news\/(\d+)\/companies/.exec(input)?.[1] ?? ''
    if (failing.has(id)) {
      return Promise.resolve(new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'forced' } }), { status: 500 }))
    }
    return Promise.resolve(new Response(JSON.stringify({ data: [company(`기업 ${id}`)] }), { status: 200 }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('loadArticleCompaniesMany — 기사별 종목을 한꺼번에', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('모두 받으면 기사마다 종목을 돌려줘요', async () => {
    stubCompanies(new Set())
    const result = await loadArticleCompaniesMany('9101,9102')
    expect([...result.keys()]).toEqual(['9101', '9102'])
    expect(result.get('9102')?.[0].companyName).toBe('기업 9102')
  })

  it('하나라도 실패하면 일부만 돌려주지 않고 실패해요', async () => {
    stubCompanies(new Set(['9202']))
    const error = await loadArticleCompaniesMany('9201,9202,9203').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 500 })
  })

  it('다시 시도하면 실패한 기사만 다시 요청해요', async () => {
    stubCompanies(new Set(['9302']))
    await loadArticleCompaniesMany('9301,9302,9303').catch(() => null)
    const retry = stubCompanies(new Set())
    const result = await loadArticleCompaniesMany('9301,9302,9303')
    expect(result.size).toBe(3)
    expect(retry.mock.calls.map(([url]) => /\/news\/(\d+)\//.exec(url)?.[1])).toEqual(['9302'])
  })
})
