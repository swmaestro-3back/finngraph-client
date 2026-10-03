import { describe, expect, it, vi } from 'vitest'
import { cachedLoader } from '@/lib/queries/useApi'

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
