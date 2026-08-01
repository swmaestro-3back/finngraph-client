import { useMemo, useState } from 'react'

/**
 * 테이블 정렬 상태 — 같은 컬럼 재클릭은 오름/내림 토글, 다른 컬럼은 내림차순부터 시작.
 * 문자열 값은 한국어 로캘 기준, 나머지는 숫자로 비교한다.
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

  const sorted = useMemo(() => {
    const next = [...rows]
    next.sort((a, b) => {
      const av = a[sortKey]
      const bv = b[sortKey]
      const compared =
        typeof av === 'string' && typeof bv === 'string'
          ? av.localeCompare(bv, 'ko')
          : Number(av) - Number(bv)
      return sortDesc ? -compared : compared
    })
    return next
  }, [rows, sortKey, sortDesc])

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
