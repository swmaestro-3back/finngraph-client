import { useMemo, useState } from 'react'
import { compareNullLast } from '@/lib/themeMetrics'

/** 문자열 값은 한국어 로캘 기준, 나머지는 숫자로 비교한다. null·undefined는 방향과 무관하게 맨 뒤 */
export function sortRows<T, K extends keyof T>(rows: T[], key: K, desc: boolean): T[] {
  const next = [...rows]
  next.sort((a, b) => compareNullLast(a[key], b[key], desc))
  return next
}

/**
 * 테이블 정렬 상태 — 같은 컬럼 재클릭은 오름/내림 토글, 다른 컬럼은 내림차순부터 시작.
 *
 * K(정렬 가능한 컬럼 키)는 initialKey 하나로 좁혀지면 안 되므로 호출부에서 명시한다.
 * 예: useTableSort<StockListRow, SortKey>(rows, 'w1')
 */
export function useTableSort<T, K extends Extract<keyof T, string>>(
  rows: T[],
  initialKey: K,
  initialDesc = true,
) {
  const [sortKey, setSortKey] = useState<K>(initialKey)
  const [sortDesc, setSortDesc] = useState(initialDesc)

  const sorted = useMemo(() => sortRows(rows, sortKey, sortDesc), [rows, sortKey, sortDesc])

  const handleSort = (key: K) => {
    if (key === sortKey) {
      setSortDesc((desc) => !desc)
    } else {
      setSortKey(key)
      setSortDesc(true)
    }
  }

  return { sorted, sortKey, sortDesc, handleSort }
}
