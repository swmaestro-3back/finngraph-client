import { describe, expect, it, vi } from 'vitest'
import { createTtlCache } from '@/lib/queries/ttlCache'

function setup(ttlMs = 1000) {
  let clock = 0
  const cached = createTtlCache<string>(ttlMs, () => clock)
  return { cached, advance: (ms: number) => (clock += ms) }
}

describe('createTtlCache', () => {
  it('ttl 안에서는 같은 키를 한 번만 부른다', async () => {
    const { cached, advance } = setup()
    const fetcher = vi.fn().mockResolvedValue('a')
    expect(await cached('k', fetcher)).toBe('a')
    advance(999)
    expect(await cached('k', fetcher)).toBe('a')
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('진행 중인 요청도 함께 쓴다', async () => {
    const { cached } = setup()
    const fetcher = vi.fn().mockResolvedValue('a')
    await Promise.all([cached('k', fetcher), cached('k', fetcher)])
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('ttl이 지나면 다시 부른다', async () => {
    const { cached, advance } = setup()
    const fetcher = vi.fn().mockResolvedValueOnce('old').mockResolvedValueOnce('new')
    expect(await cached('k', fetcher)).toBe('old')
    advance(1000)
    expect(await cached('k', fetcher)).toBe('new')
  })

  it('키가 다르면 따로 부른다', async () => {
    const { cached } = setup()
    const fetcher = vi.fn().mockResolvedValue('a')
    await cached('k1', fetcher)
    await cached('k2', fetcher)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('실패한 요청은 남기지 않아 다음 호출이 다시 시도한다', async () => {
    const { cached } = setup()
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce('a')
    await expect(cached('k', fetcher)).rejects.toThrow('down')
    expect(await cached('k', fetcher)).toBe('a')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
