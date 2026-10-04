import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { readPage, readSort, writePage, writeSort } from '@/lib/listParams'
import { sortRows } from '@/lib/useTableSort'

/**
 * useTableSort의 주소 쿼리 판 — 정렬 상태를 ?sort=&dir= 에 둔다.
 * 정렬이 바뀌면 보던 페이지 번호는 의미가 없어지므로 같은 갱신에서 page도 지운다.
 */
export function useUrlTableSort<T, K extends Extract<keyof T, string>>(
  rows: T[],
  keys: readonly K[],
  initialKey: K,
) {
  const [params, setParams] = useSearchParams()
  const { key: sortKey, desc: sortDesc } = readSort(params, keys, initialKey)

  const sorted = useMemo(() => sortRows(rows, sortKey, sortDesc), [rows, sortKey, sortDesc])

  const handleSort = (key: K) => {
    const next = new URLSearchParams(params)
    writeSort(next, { key, desc: key === sortKey ? !sortDesc : true }, initialKey)
    writePage(next, 1)
    setParams(next, { replace: true })
  }

  return { sorted, sortKey, sortDesc, handleSort }
}

/**
 * 현재 페이지를 ?page= 에 둔다. 주소의 값이 범위를 벗어나면(데이터 로딩 전, 필터로 줄어든 뒤)
 * 주소는 건드리지 않고 화면에서만 끝 페이지로 맞춘다.
 */
function usePageParam(totalPages: number) {
  const [params, setParams] = useSearchParams()
  const page = Math.min(readPage(params), totalPages)

  const goToPage = (target: number) => {
    const next = new URLSearchParams(params)
    writePage(next, Math.min(totalPages, Math.max(1, target)))
    // 페이지 이동은 히스토리에 쌓는다 — 브라우저 뒤로가기가 이전 페이지로 간다
    setParams(next)
    window.scrollTo(0, 0)
  }

  return { page, goToPage }
}

/** 정렬된 전체 행에서 현재 페이지 몫만 — 페이지 번호는 usePageParam이 주소에서 읽는다 */
export function usePagedRows<T>(rows: T[], pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const { page, goToPage } = usePageParam(totalPages)
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)
  return { page, totalPages, goToPage, pageRows }
}
