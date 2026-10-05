import { Lock } from 'lucide-react'
import { Button } from '@/components/fg/Button'
import type { GraphNode, IssueGraphModel } from '@/lib/fg/issuePage'
import { useMemberGate } from '@/lib/memberGate'

const HALF = 14
const LOCKED_KINDS: readonly GraphNode['kind'][] = ['link', 'link-more', 'second']

function NodeLogo({ x, y, name }: { x: number; y: number; name: string }) {
  return (
    <>
      <circle className="fg-igraph__logo" cx={x} cy={y} r={7.5} />
      <text className="fg-igraph__ini" x={x} y={y + 4} textAnchor="middle">
        {name.slice(0, 1)}
      </text>
    </>
  )
}

function GraphNodeView({ node, locked }: { node: GraphNode; locked: boolean }) {
  const { x, y, w, kind, label } = node
  const box = { x, y: y - HALF, width: w, height: HALF * 2, rx: HALF }
  if (locked && LOCKED_KINDS.includes(kind)) return <rect className="fg-igraph__ghost" {...box} />
  if (kind === 'event') {
    return (
      <g className="fg-igraph__event">
        <rect {...box} />
        <rect className="fg-igraph__dia" x={x + 14} y={y - 4} width={8} height={8} transform={`rotate(45 ${x + 18} ${y})`} />
        <text x={x + 30} y={y + 4}>
          {label}
        </text>
      </g>
    )
  }
  if (kind === 'news-more' || kind === 'link-more') {
    return (
      <g className={kind === 'news-more' ? 'fg-igraph__news-more' : 'fg-igraph__link-more'}>
        <rect {...box} />
        <circle cx={x + 16} cy={y} r={4} />
        <text x={x + 28} y={y + 4}>
          {label}
        </text>
      </g>
    )
  }
  return (
    <g className={kind === 'news' ? 'fg-igraph__news' : 'fg-igraph__link'}>
      <rect {...box} />
      <NodeLogo x={x + 18} y={y} name={label} />
      <text x={x + 32} y={y + 4}>
        {label}
      </text>
    </g>
  )
}

interface IssueGraphProps {
  graph: IssueGraphModel
  locked: boolean
}

export function IssueGraph({ graph, locked }: IssueGraphProps) {
  const { promptLogin } = useMemberGate()
  const gated = locked && graph.inferred > 0
  return (
    <>
      <div className="fg-igraph">
        <svg
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          role="img"
          aria-label={gated ? graph.guestLabel : graph.memberLabel}
        >
          <g className="fg-igraph__edges fg-igraph__edges--direct">
            {graph.edges
              .filter((edge) => edge.kind === 'direct')
              .map((edge) => (
                <path key={edge.key} d={edge.d} />
              ))}
          </g>
          <g className="fg-igraph__edges fg-igraph__edges--inferred">
            {graph.edges
              .filter((edge) => edge.kind === 'inferred')
              .map((edge) => (
                <path key={edge.key} d={edge.d} />
              ))}
          </g>
          <g className="fg-igraph__nodes">
            {graph.nodes.map((node) => (
              <GraphNodeView key={node.key} node={node} locked={gated} />
            ))}
          </g>
        </svg>
        {gated && (
          <div className="fg-gate__over fg-igraph__gate">
            <span className="fg-gate__lock" aria-hidden="true">
              <Lock size={20} strokeWidth={1.75} />
            </span>
            <p className="fg-gate__title fg-gate__title--compact">{`이런 기업 ${graph.inferred}곳은 로그인하면 볼 수 있어요`}</p>
            <Button variant="primary" onClick={promptLogin}>
              로그인
            </Button>
          </div>
        )}
      </div>
      <div className="fg-igraph__legend" aria-hidden="true">
        <span>
          <i />
          뉴스·공시로 확인된 관계
        </span>
        <span>
          <i className="fg-igraph__dash" />
          AI가 찾은 관계
        </span>
      </div>
    </>
  )
}
