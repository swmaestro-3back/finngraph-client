import { useParams } from 'react-router-dom'
import { GraphView } from '@/components/graph/GraphView'
import type { GraphFocus } from '@/data/graphTypes'

const DEFAULT_TICKER = '005930'

// 지식그래프 페이지 — /graph/:ticker? 는 기업 공급망, /graph/theme/:name 은 테마와 소속 기업을 그린다.
// 헤더(56px + 보더 1px) 아래부터 뷰포트 하단까지 전체 공간을 그래프가 사용한다.
export default function CorpGraphPage() {
  const { ticker, name } = useParams()
  const focus: GraphFocus = name
    ? { kind: 'theme', name }
    : { kind: 'company', ticker: ticker ?? DEFAULT_TICKER }
  return (
    <section
      className="relative w-full overflow-hidden border-b border-border"
      style={{ height: 'calc(100vh - 3.5rem - 1px)' }}
    >
      <GraphView focus={focus} />
    </section>
  )
}
