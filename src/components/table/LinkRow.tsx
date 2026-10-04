import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

/** 숫자 칸 공통 클래스 — 종목·테마 목록이 같은 표기로 맞춘다 */
export const NUM = 'text-center font-mono text-sm leading-none tabular-nums'

interface LinkRowProps {
  to: string
  /** 0부터 — 홀수 행에 줄무늬를 넣는다 */
  index: number
  /** 열 그리드 클래스 */
  gridClassName: string
  children: ReactNode
}

/**
 * 목록의 한 행 — 별표가 행 안에 들어가 button 중첩이 되므로 div+role="link"로 만든다.
 * 돌아올 주소(from)에 현재 쿼리까지 실어 상세에 다녀와도 보던 목록으로 돌아온다.
 */
export function LinkRow({ to, index, gridClassName, children }: LinkRowProps) {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const open = () => navigate(to, { state: fromState(pathname + search) })
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        open()
      }}
      className={cn(
        gridClassName,
        'w-full cursor-pointer border-b border-surface-inset px-4 py-2.5 text-left hover:bg-muted',
        index % 2 === 1 && 'bg-foreground/[0.016]',
      )}
    >
      {children}
    </div>
  )
}
