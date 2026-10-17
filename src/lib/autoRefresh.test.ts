import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AUTO_REFRESH_MS, REFRESH_CACHE_TTL_MS, shouldAutoRefresh, startAutoRefresh } from '@/lib/autoRefresh'
import { createTtlCache } from '@/lib/queries/ttlCache'

const kst = (local: string) => new Date(`${local}+09:00`)

const intraday = {
  baseDate: '2026-10-01',
  valuationDate: '2026-09-30',
  updatedAt: '2026-10-01T17:05:00+09:00',
}
const settled = {
  baseDate: '2026-10-01',
  valuationDate: '2026-10-01',
  updatedAt: '2026-10-01T18:10:00+09:00',
}
const yesterday = { baseDate: '2026-09-30', valuationDate: '2026-09-30', updatedAt: null }

describe('shouldAutoRefresh', () => {
  it('평일 08:00–20:00 KST 에는 기준일과 무관하게 갱신한다', () => {
    expect(shouldAutoRefresh(kst('2026-10-01T08:00:00'), yesterday)).toBe(true)
    expect(shouldAutoRefresh(kst('2026-10-01T15:29:00'), null)).toBe(true)
    expect(shouldAutoRefresh(kst('2026-10-01T18:30:00'), settled)).toBe(true)
    expect(shouldAutoRefresh(kst('2026-10-01T19:59:00'), settled)).toBe(true)
  })

  it('20시가 지나도 오늘 가격이 확정 전이면 계속 갱신한다', () => {
    expect(shouldAutoRefresh(kst('2026-10-01T20:30:00'), intraday)).toBe(true)
  })

  it('20시 뒤에 오늘 가격이 확정되면 멈춘다', () => {
    expect(shouldAutoRefresh(kst('2026-10-01T20:40:00'), settled)).toBe(false)
  })

  it('08시 전과 주말에는 갱신하지 않는다', () => {
    expect(shouldAutoRefresh(kst('2026-10-01T07:59:00'), yesterday)).toBe(false)
    expect(shouldAutoRefresh(kst('2026-10-03T11:00:00'), settled)).toBe(false)
  })

  it('확정 전 가격이 지난 날짜면 갱신하지 않는다', () => {
    expect(shouldAutoRefresh(kst('2026-10-02T07:00:00'), intraday)).toBe(false)
  })
})

class FakePage extends EventTarget {
  visibilityState: DocumentVisibilityState = 'visible'

  show(state: DocumentVisibilityState) {
    this.visibilityState = state
    this.dispatchEvent(new Event('visibilitychange'))
  }
}

function start(active: (now: Date) => boolean = () => true) {
  const page = new FakePage()
  const refresh = vi.fn()
  const stop = startAutoRefresh({ intervalMs: AUTO_REFRESH_MS, refresh, active, page })
  return { page, refresh, stop }
}

describe('startAutoRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(kst('2026-10-01T10:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('보이는 동안 주기마다 한 번씩 다시 불러온다', () => {
    const { refresh } = start()

    vi.advanceTimersByTime(AUTO_REFRESH_MS - 1)
    expect(refresh).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(refresh).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(AUTO_REFRESH_MS * 2)
    expect(refresh).toHaveBeenCalledTimes(3)
  })

  it('갱신 시간대가 아니면 건너뛰다가 시간대가 되면 다시 부른다', () => {
    let open = false
    const { refresh } = start(() => open)

    vi.advanceTimersByTime(AUTO_REFRESH_MS * 3)
    expect(refresh).not.toHaveBeenCalled()
    open = true
    vi.advanceTimersByTime(AUTO_REFRESH_MS)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('숨겨진 동안 멈추고 주기가 지난 뒤 돌아오면 바로 부른다', () => {
    const { page, refresh } = start()

    page.show('hidden')
    vi.advanceTimersByTime(AUTO_REFRESH_MS * 3)
    expect(refresh).not.toHaveBeenCalled()
    page.show('visible')
    vi.advanceTimersByTime(0)
    expect(refresh).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(AUTO_REFRESH_MS - 1)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('주기 안에 돌아오면 남은 시간만 기다린다', () => {
    const { page, refresh } = start()

    vi.advanceTimersByTime(AUTO_REFRESH_MS / 2)
    page.show('hidden')
    vi.advanceTimersByTime(AUTO_REFRESH_MS / 5)
    page.show('visible')
    vi.advanceTimersByTime((AUTO_REFRESH_MS * 3) / 10 - 1)
    expect(refresh).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('자동 갱신이 부르는 캐시는 화면이 늦게 받아 둔 응답도 갱신 때 다시 받는다', async () => {
    const cached = createTtlCache<number>(REFRESH_CACHE_TTL_MS)
    let version = 0
    const fetcher = vi.fn(() => Promise.resolve(++version))
    const seen: number[] = []
    const stop = startAutoRefresh({
      intervalMs: AUTO_REFRESH_MS,
      refresh: () => void cached('k', fetcher).then((v) => seen.push(v)),
      active: () => true,
      page: new FakePage(),
    })

    vi.advanceTimersByTime(1000)
    expect(await cached('k', fetcher)).toBe(1)
    await vi.advanceTimersByTimeAsync(AUTO_REFRESH_MS - 1000)
    expect(seen).toEqual([2])
    stop()
  })

  it('멈추면 타이머와 리스너를 모두 푼다', () => {
    const { page, refresh, stop } = start()

    stop()
    page.show('hidden')
    page.show('visible')
    vi.advanceTimersByTime(AUTO_REFRESH_MS * 3)
    expect(refresh).not.toHaveBeenCalled()
  })
})
