import { useLocation } from 'react-router-dom'

// 상세 페이지 뒤로가기 — 진입한 페이지를 링크 state(from)로 넘겨받아 그대로 돌아간다

export interface BackTarget {
  to: string
  label: string
}

/** 경로 → 뒤로가기 버튼에 쓸 라벨 (모르는 경로면 null) */
export function pathLabel(pathname: string): string | null {
  if (pathname === '/') return '테마 대시보드'
  if (pathname === '/themes') return '테마'
  if (pathname.startsWith('/themes/')) return '테마 상세'
  if (pathname === '/stocks') return '종목'
  if (pathname.startsWith('/stocks/')) return '이전 종목'
  if (pathname.startsWith('/issues/')) return '이슈'
  if (pathname === '/graph' || pathname.startsWith('/graph/')) return '관계 탐색'
  if (pathname === '/calendar') return '캘린더'
  if (pathname.startsWith('/theme/')) return '테마 상세'
  if (pathname.startsWith('/stock/')) return '주식 상세'
  return null
}

/** 상세 페이지로 이동할 때 실어 보낼 state */
export function fromState(pathname: string): { from: string } {
  return { from: pathname }
}

export function resolveBackTarget(state: unknown, fallback: BackTarget): BackTarget {
  const from = (state as { from?: unknown } | null)?.from
  if (typeof from !== 'string') return fallback

  const label = pathLabel(from.split(/[?#]/)[0])
  return label ? { to: from, label } : fallback
}

/** state.from이 있으면 그 페이지로, 없으면(직접 진입·새로고침) fallback으로 */
export function useBackTarget(fallback: BackTarget): BackTarget {
  const { state } = useLocation()
  return resolveBackTarget(state, fallback)
}
