import { useParams } from 'react-router-dom'
import { GraphView } from '@/components/graph/GraphView'
import type { GraphFocus } from '@/data/graphTypes'

const DEFAULT_TICKER = '005930'

// 지식그래프 페이지 — /graph/:ticker? 는 기업 공급망, /graph/theme/:name 은 테마와 소속 기업을 그린다.
export default function CorpGraphPage() {
  const { ticker, name } = useParams()
  const focus: GraphFocus = name
    ? { kind: 'theme', name }
    : { kind: 'company', ticker: ticker ?? DEFAULT_TICKER }
  return (
    <section className="fg-fullview relative w-full overflow-hidden border-b border-border">
      <GraphView focus={focus} />
    </section>
  )
}
