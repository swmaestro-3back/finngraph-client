import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, getData, qs } from '@/lib/api'

describe('qs', () => {
  it('params가 없거나 비면 빈 문자열', () => {
    expect(qs()).toBe('')
    expect(qs({})).toBe('')
  })

  it('undefined 값만 생략하고 0과 빈 문자열은 살린다', () => {
    expect(qs({ hop: 2, market: undefined, page: 0, q: '' })).toBe('?hop=2&page=0&q=')
  })

  it('전부 undefined면 빈 문자열', () => {
    expect(qs({ a: undefined, b: undefined })).toBe('')
  })

  it('한글은 URLSearchParams 규칙으로 인코딩한다', () => {
    expect(qs({ q: '삼성' })).toBe('?q=%EC%82%BC%EC%84%B1')
  })
})

describe('request 실패 정규화', () => {
  afterEach(() => vi.unstubAllGlobals())

  async function fail(): Promise<unknown> {
    return getData('/v1/x').catch((e: unknown) => e)
  }

  it('타임아웃은 TIMEOUT · status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError')))
    const err = await fail()
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ code: 'TIMEOUT', status: 0, message: '요청 시간 초과: /v1/x' })
  })

  it('그 밖의 fetch 예외는 NETWORK_ERROR · status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const err = await fail()
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ code: 'NETWORK_ERROR', status: 0, message: '네트워크 오류: /v1/x' })
  })

  it('성공 응답의 JSON 파싱 실패는 PARSE_ERROR에 HTTP 상태를 싣는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json', { status: 200 })))
    const err = await fail()
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ code: 'PARSE_ERROR', status: 200, message: '응답 JSON 파싱 실패: /v1/x' })
  })

  it('에러 엔벨로프는 code·message·status를 그대로 옮긴다', async () => {
    const body = JSON.stringify({ error: { code: 'STOCK_NOT_FOUND', message: '없는 종목' } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 404 })))
    const err = await fail()
    expect(err).toMatchObject({ code: 'STOCK_NOT_FOUND', status: 404, message: '없는 종목' })
  })

  it('쿼리는 경로 뒤에 qs 형식으로 붙는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: 1 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getData('/v1/x', { hop: 2 })).resolves.toBe(1)
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/v1\/x\?hop=2$/)
  })
})
