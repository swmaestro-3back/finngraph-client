import { useCallback, useId, useMemo, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/fg/Button'
import { LucianIcon } from '@/components/fg/LucianIcon'
import type { GraphEdge, GraphNode, GraphNodeKind, IssueGraphModel } from '@/lib/fg/issuePage'
import type { IssueLink } from '@/lib/fg/issueRecords'
import { stockPath } from '@/lib/fg/paths'
import { useMemberGate } from '@/lib/memberGate'
import { fromState } from '@/lib/navigation'
import { stockLogoUrl } from '@/lib/stockLogo'
import { cn } from '@/lib/utils'

const HEIGHT = 28
const HALF = HEIGHT / 2
const LOGO = 9
const LOCKED_KINDS: readonly GraphNodeKind[] = ['link', 'link-more', 'second']
const NODE_DELAY: Record<GraphNodeKind, number> = {
  event: 0,
  news: 260,
  'news-more': 260,
  link: 760,
  'link-more': 760,
  second: 1120,
}
const EDGE_DELAY = { direct: 120, inferred: 560, second: 940 } as const

interface Lit {
  nodes: Set<string>
  edges: Set<string>
}

function lineage(graph: IssueGraphModel, key: string): Lit {
  const up = new Map<string, GraphEdge>()
  const down = new Map<string, GraphEdge[]>()
  for (const edge of graph.edges) {
    up.set(edge.to, edge)
    down.set(edge.from, [...(down.get(edge.from) ?? []), edge])
  }
  const nodes = new Set<string>([key])
  const edges = new Set<string>()
  let cursor = up.get(key)
  while (cursor) {
    edges.add(cursor.key)
    nodes.add(cursor.from)
    cursor = up.get(cursor.from)
  }
  const queue = [key]
  while (queue.length > 0) {
    const next = queue.shift() as string
    for (const edge of down.get(next) ?? []) {
      edges.add(edge.key)
      nodes.add(edge.to)
      queue.push(edge.to)
    }
  }
  return { nodes, edges }
}

function edgeDelay(edge: GraphEdge): number {
  if (edge.kind === 'direct') return EDGE_DELAY.direct
  return edge.from.startsWith('n-') ? EDGE_DELAY.inferred : EDGE_DELAY.second
}

function nodeTitle(node: GraphNode, link: IssueLink | null): string {
  const name = node.name ?? node.label
  if (node.kind === 'event') return name
  if (node.kind === 'news') return `${name} · 이 이슈 뉴스에 나온 종목`
  if (link) return `${name} · ${link.company.relation}`
  if (node.from) return `${name} · ${node.from}와 이어진 기업`
  return name
}

interface TreeNodeProps {
  node: GraphNode
  ghost: boolean
  dim: boolean
  hot: boolean
  clip: string
  title: string
  onAction: (() => void) | null
  onEnter: () => void
  onLeave: () => void
}

function TreeNode({ node, ghost, dim, hot, clip, title, onAction, onEnter, onLeave }: TreeNodeProps) {
  const { x, y, w, kind, label, ticker } = node
  const style = { '--fg-d': `${NODE_DELAY[kind]}ms` } as CSSProperties
  const box = { x, y: y - HALF, width: w, height: HEIGHT, rx: HALF }
  if (ghost) {
    return (
      <g className="fg-itree__node is-ghost">
        <g className="fg-itree__in" style={style}>
          <rect className="fg-itree__pill" {...box} />
        </g>
      </g>
    )
  }
  const bundle = kind === 'news-more' || kind === 'link-more'
  const logo = !bundle && kind !== 'event'
  const textX = kind === 'event' ? x + 30 : x + (logo ? 30 : 14)
  const onKeyDown = (event: KeyboardEvent<SVGGElement>) => {
    if (!onAction || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onAction()
  }
  return (
    <g
      className={cn('fg-itree__node', `is-${kind}`, dim && 'is-dim', hot && 'is-hot', onAction && 'is-action')}
      tabIndex={onAction ? 0 : undefined}
      role={onAction ? 'button' : undefined}
      aria-label={onAction ? title : undefined}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onAction ?? undefined}
      onKeyDown={onKeyDown}
    >
      <title>{title}</title>
      <g className="fg-itree__in" style={style}>
        <rect className="fg-itree__pill" {...box} />
        {kind === 'event' && (
          <>
            <circle className="fg-itree__pulse" cx={x + 18} cy={y} r={5} />
            <rect className="fg-itree__dia" x={x + 14} y={y - 4} width={8} height={8} transform={`rotate(45 ${x + 18} ${y})`} />
          </>
        )}
        {bundle && <circle className="fg-itree__dot" cx={x + 14} cy={y} r={3.5} />}
        {logo && (
          <>
            <circle className="fg-itree__logo" cx={x + HALF + 2} cy={y} r={LOGO} />
            <text className="fg-itree__ini" x={x + HALF + 2} y={y + 3.5} textAnchor="middle">
              {(node.name ?? label).slice(0, 1)}
            </text>
            {ticker && (
              <image
                href={stockLogoUrl(ticker)}
                x={x + HALF + 2 - LOGO}
                y={y - LOGO}
                width={LOGO * 2}
                height={LOGO * 2}
                clipPath={`url(#${clip})`}
                preserveAspectRatio="xMidYMid slice"
              />
            )}
          </>
        )}
        <text className="fg-itree__label" x={bundle ? x + 24 : textX} y={y + 4}>
          {label}
        </text>
      </g>
    </g>
  )
}

interface IssueTreeGraphProps {
  graph: IssueGraphModel
  locked: boolean
  links: readonly IssueLink[]
  onOpenLink: (link: IssueLink) => void
}

export function IssueTreeGraph({ graph, locked, links, onOpenLink }: IssueTreeGraphProps) {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const { promptLogin } = useMemberGate()
  const clip = `${useId().replace(/[^a-zA-Z0-9_-]/g, '')}-logo`
  const [active, setActive] = useState<string | null>(null)
  const gated = locked
  const lit = useMemo(() => (active ? lineage(graph, active) : null), [graph, active])
  const linkOf = useCallback(
    (node: GraphNode) => links.find((link) => link.from === node.from && link.company.name === node.name) ?? null,
    [links],
  )

  const actionOf = (node: GraphNode): (() => void) | null => {
    if (gated && LOCKED_KINDS.includes(node.kind)) return null
    if (node.kind === 'link') {
      const link = linkOf(node)
      if (link) return () => onOpenLink(link)
    }
    if ((node.kind === 'news' || node.kind === 'second') && node.ticker) {
      const ticker = node.ticker
      return () => navigate(stockPath(ticker), { state: fromState(`${pathname}${search}`) })
    }
    return null
  }

  const caption = gated
    ? `뉴스에 나온 종목 ${graph.news}개`
    : `뉴스에 나온 종목 ${graph.news}개${graph.inferred > 0 ? ` · 이어진 기업 ${graph.inferred}곳` : ''}`

  return (
    <>
      <div className={cn('fg-igraph fg-itree', lit && 'is-focus')}>
        <p className="fg-igraph__cap fg-num">{caption}</p>
        <svg
          className="fg-itree__svg"
          viewBox={`0 0 ${graph.width} ${graph.height}`}
          role="group"
          aria-label={gated ? graph.guestLabel : graph.memberLabel}
        >
          <defs>
            <clipPath id={clip} clipPathUnits="objectBoundingBox">
              <circle cx="0.5" cy="0.5" r="0.5" />
            </clipPath>
          </defs>
          <g className="fg-itree__edges">
            {graph.edges.map((edge) => {
              const ghost = gated && edge.kind === 'inferred'
              const solid = edge.kind === 'direct' || (edge.confirmed && !ghost)
              return (
                <path
                  key={edge.key}
                  d={edge.d}
                  pathLength={solid ? 1 : undefined}
                  className={cn(
                    'fg-itree__edge',
                    `is-${edge.kind}`,
                    solid ? 'is-solid' : 'is-dash',
                    ghost && 'is-ghost',
                    lit && (lit.edges.has(edge.key) ? 'is-hot' : 'is-dim'),
                  )}
                  style={{ '--fg-d': `${edgeDelay(edge)}ms` } as CSSProperties}
                />
              )
            })}
          </g>
          <g className="fg-itree__nodes">
            {graph.nodes.map((node) => {
              const ghost = gated && LOCKED_KINDS.includes(node.kind)
              return (
                <TreeNode
                  key={node.key}
                  node={node}
                  ghost={ghost}
                  dim={lit !== null && !lit.nodes.has(node.key)}
                  hot={active === node.key}
                  clip={clip}
                  title={nodeTitle(node, node.kind === 'link' ? linkOf(node) : null)}
                  onAction={actionOf(node)}
                  onEnter={() => setActive(node.key)}
                  onLeave={() => setActive((current) => (current === node.key ? null : current))}
                />
              )
            })}
          </g>
        </svg>
        {gated && (
          <div className="fg-igraph__gate">
            <span className="fg-igraph__lock" aria-hidden="true">
              <LucianIcon name="lock" size={16} />
            </span>
            <p className="fg-igraph__gtext">
              {graph.inferred > 0
                ? `이런 기업 ${graph.inferred}곳은 로그인하면 볼 수 있어요`
                : '관계로 이어진 기업은 로그인하면 볼 수 있어요'}
            </p>
            <Button variant="primary" size="sm" onClick={promptLogin}>
              로그인
            </Button>
          </div>
        )}
      </div>
      <div className="fg-igraph__legend" aria-hidden="true">
        <span>
          <i className="fg-itree__key fg-itree__key--direct" />
          뉴스에 나온 종목
        </span>
        {graph.inferred > 0 && (
          <span className="fg-igraph__group">
            <span className="fg-igraph__scope">이어진 기업:</span>
            <span>
              <i className="fg-itree__key fg-itree__key--confirmed" />
              공시 근거
            </span>
            <span>
              <i className="fg-itree__key fg-itree__key--news" />
              뉴스 근거
            </span>
          </span>
        )}
      </div>
    </>
  )
}
