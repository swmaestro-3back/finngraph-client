import type { ReactNode } from 'react'
import { GraphView } from '@/components/graph/GraphView'
import { EXAMPLE_TICKER } from '@/lib/graphStart'
import { T } from '@/lib/graphTheme'
import { cn } from '@/lib/utils'

interface Props {
  /** 회원이면 실제 삼성전자 그래프를 부른다. 게스트(기본)는 회원 데이터를 못 부르니 예시 스냅샷을 깐다 */
  live?: boolean
  /** 시작 모달처럼 뒤를 더 어둡게 가라앉힐 때 */
  dim?: boolean
  children?: ReactNode
}

const BACKDROP_FOCUS = { kind: 'company', ticker: EXAMPLE_TICKER } as const

/**
 * 시작 모달·로그인 안내 뒤에 깔리는 배경 — 실제 관계 탐색 페이지(삼성전자)를 그대로 흐리게 보여 준다.
 * inert라 보이기만 하고 만져지지 않으며, backdrop 모드라 최근 본 기업·첫 방문 가이드 같은 흔적을 남기지 않는다.
 */
export function GraphBackdrop({ live = false, dim = false, children }: Props) {
  return (
    <div className="relative size-full overflow-hidden" style={{ background: T.canvas }}>
      <div aria-hidden inert className="absolute inset-0 blur-[3px] saturate-50 select-none">
        {/* 게스트↔회원이 바뀌면 데이터 출처가 바뀌므로 새로 마운트한다 */}
        <GraphView key={live ? 'live' : 'example'} focus={BACKDROP_FOCUS} example={!live} backdrop />
      </div>
      <div aria-hidden className={cn('absolute inset-0', dim ? 'bg-foreground/15' : 'bg-background/30')} />
      {children}
    </div>
  )
}
