/**
 * 키별 요청을 ttl 동안 쥐고 있는 탭 메모리 캐시 — 같은 키를 다시 부르면 진행 중이거나 끝난 요청을 그대로 돌려준다.
 * 시세가 아닌 데이터(비교용 캔들, 뉴스 목록)에만 쓴다. 시세는 늘 새로 받는다.
 * 실패한 요청은 남기지 않아 다음 호출이 다시 시도하고, 새로고침하면 전부 비워진다.
 * 캐시할 곳이 늘어 무효화·재검증이 필요해지면 이 헬퍼를 키우지 말고 데이터 패칭 라이브러리 도입을 검토한다.
 */
export function createTtlCache<T>(ttlMs: number, now: () => number = Date.now) {
  const entries = new Map<string, { expiresAt: number; value: Promise<T> }>()

  return (key: string, fetcher: () => Promise<T>): Promise<T> => {
    const at = now()
    const hit = entries.get(key)
    if (hit && hit.expiresAt > at) return hit.value

    // 만료된 항목이 쌓이지 않게 새로 넣을 때 함께 치운다
    entries.forEach((entry, k) => {
      if (entry.expiresAt <= at) entries.delete(k)
    })
    const value: Promise<T> = fetcher().catch((e: unknown) => {
      // 그사이 같은 키로 새 요청이 들어왔으면 그것은 건드리지 않는다
      if (entries.get(key)?.value === value) entries.delete(key)
      throw e
    })
    entries.set(key, { expiresAt: at + ttlMs, value })
    return value
  }
}
