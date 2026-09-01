import { useParams } from 'react-router-dom'
import { GraphView } from '@/components/graph/GraphView'

const DEFAULT_TICKER = '005930'

// 기업 그래프 — 지식그래프 시각화 페이지
// 헤더(56px + 보더 1px) 아래부터 뷰포트 하단까지 전체 공간을 그래프가 사용한다.
export default function CorpGraphPage() {
  const { ticker } = useParams()
  return (
    <section
      className="relative w-full overflow-hidden border-b border-border"
      style={{ height: 'calc(100vh - 3.5rem - 1px)' }}
    >
      <GraphView ticker={ticker ?? DEFAULT_TICKER} />
    </section>
  )
}
