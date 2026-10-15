import { useCallback, type ReactNode } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { GraphLocked } from '@/components/graph/GraphLocked'
import { GraphStart } from '@/components/graph/GraphStart'
import { GraphView } from '@/components/graph/GraphView'
import type { GraphFocus } from '@/data/graphTypes'
import { graphPath } from '@/lib/graphRoute'
import { EXAMPLE_PATH, EXAMPLE_SLUG, EXAMPLE_TICKER } from '@/lib/graphStart'
import { useMemberGate } from '@/lib/memberGate'
import { GraphBackdrop } from '@/components/graph/GraphBackdrop'

const DEFAULT_TICKER = '005930'

function GraphFrame({ children }: { children: ReactNode }) {
  return (
    <section className="fg-fullview relative w-full overflow-hidden border-b border-border">{children}</section>
  )
}

// 지식그래프 페이지 — /graph/:ticker? 는 기업 공급망, /graph/theme/:name 은 테마와 소속 기업을 그린다.
export default function CorpGraphPage() {
  const { ticker, name } = useParams()
  const navigate = useNavigate()
  const { locked, pending } = useMemberGate()
  const start = useCallback((next: GraphFocus) => navigate(graphPath(next), { replace: true }), [navigate])
  const openExample = useCallback(() => navigate(EXAMPLE_PATH), [navigate])

  if (ticker === EXAMPLE_SLUG) {
    if (pending) return <GraphFrame><GraphBackdrop /></GraphFrame>
    if (!locked) return <Navigate to={graphPath({ kind: 'company', ticker: EXAMPLE_TICKER })} replace />
    return (
      <GraphFrame>
        <GraphView focus={{ kind: 'company', ticker: EXAMPLE_TICKER }} example />
      </GraphFrame>
    )
  }

  if (!ticker && !name) {
    return (
      <GraphFrame>
        <GraphStart ready={!pending} guest={locked} onSelect={start} onExample={openExample} />
      </GraphFrame>
    )
  }

  const focus: GraphFocus = name
    ? { kind: 'theme', name }
    : { kind: 'company', ticker: ticker ?? DEFAULT_TICKER }
  return (
    <GraphFrame>
      {locked || pending ? <GraphLocked focus={focus} ready={!pending} /> : <GraphView focus={focus} />}
    </GraphFrame>
  )
}
