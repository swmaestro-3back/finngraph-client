import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/api'
import { getKgData } from '@/lib/kgApi'

describe('getKgData 실패 정규화', () => {
  afterEach(() => vi.unstubAllGlobals())

  async function fail(): Promise<unknown> {
    return getKgData('/v1/x').catch((e: unknown) => e)
  }

  it('타임아웃은 TIMEOUT · status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError')))
    const err = await fail()
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ code: 'TIMEOUT', status: 0, message: '요청 시간 초과: /v1/x' })
  })

  it('그 밖의 fetch 예외는 NETWORK_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const err = await fail()
    expect(err).toMatchObject({ code: 'NETWORK_ERROR', status: 0, message: '네트워크 오류: /v1/x' })
  })

  it('404는 NOT_FOUND, FastAPI detail 문자열이 메시지', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: '없음' }), { status: 404 })),
    )
    const err = await fail()
    expect(err).toMatchObject({ code: 'NOT_FOUND', status: 404, message: '없음' })
  })

  it('그 밖의 HTTP 에러는 KG_ERROR, detail이 없으면 기본 문구', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('oops', { status: 500 })))
    const err = await fail()
    expect(err).toMatchObject({ code: 'KG_ERROR', status: 500, message: '비정상 에러 응답 (HTTP 500)' })
  })

  it('성공 응답의 JSON 파싱 실패는 PARSE_ERROR', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not json', { status: 200 })))
    const err = await fail()
    expect(err).toMatchObject({ code: 'PARSE_ERROR', status: 200, message: '응답 JSON 파싱 실패: /v1/x' })
  })

  it('쿼리는 경로 뒤에 붙고 본문은 언래핑 없이 그대로', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ a: 1 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getKgData('/v1/x', { hop: 2 })).resolves.toEqual({ a: 1 })
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/v1\/x\?hop=2$/)
  })
})
