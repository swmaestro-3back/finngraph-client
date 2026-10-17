import { describe, expect, it, vi } from 'vitest'
import { awaiting, cachedLoader } from '@/lib/queries/useApi'

describe('awaiting', () => {
  it('첫 렌더(loading=false, data=null)부터 참이다 — 빈 목록이 한 프레임 비치지 않게', () => {
    expect(awaiting({ data: null, loading: false, error: null })).toBe(true)
    expect(awaiting({ data: null, loading: true, error: null })).toBe(true)
  })

  it('응답이 오거나 실패하면 거짓', () => {
    expect(awaiting({ data: [], loading: false, error: null })).toBe(false)
    expect(awaiting({ data: null, loading: false, error: { code: 'KG_ERROR' } })).toBe(false)
  })

  it('부르지 않는 요청(enabled=false)은 기다리지 않는다', () => {
    expect(awaiting({ data: null, loading: false, error: null }, false)).toBe(false)
  })
})

describe('cachedLoader', () => {
  it('성공한 Promise를 쥐고 있어 두 번째 호출은 같은 Promise를 돌려준다', async () => {
    const load = vi.fn().mockResolvedValue(['a'])
    const cached = cachedLoader(load)
    const first = cached()
    expect(cached()).toBe(first)
    await expect(first).resolves.toEqual(['a'])
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('실패하면 캐시를 비워 다음 호출이 다시 시도한다', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(['b'])
    const cached = cachedLoader(load)
    await expect(cached()).rejects.toThrow('down')
    await expect(cached()).resolves.toEqual(['b'])
    expect(load).toHaveBeenCalledTimes(2)
  })
})
