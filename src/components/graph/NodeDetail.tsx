import { Crosshair, ExternalLink, Network, Newspaper } from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  CATEGORY_LABELS,
  nodeCategory,
  nodeColor,
  type GraphNode,
} from '@/data/graphTypes'
import type { StockRowRes } from '@/lib/apiTypes'
import type { NodeNeighbors } from '@/lib/graphNeighbors'
import {
  changeColorClass,
  formatChangeOrDash,
  formatCompactKrw,
  formatPriceOrDash,
} from '@/lib/format'
import { EntityChip, Section, TypeBadge } from '@/components/graph/DetailParts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

const MAX_CONNECTED = 16

/** 종목 상세 페이지는 국내 상장사(country=KR)만 있다 — 해외 기업은 버튼을 비활성 처리하고 이 문구로 안내한다 */
const FOREIGN_DETAIL_NOTICE = '해외 기업 종목 상세는 준비 중입니다'

/** 지수 편입 플래그 → 칩 라벨 */
const INDEX_FLAGS = [
  { key: 'krx100', label: 'KRX100' },
  { key: 'krx300', label: 'KRX300' },
  { key: 'kosdaq150', label: 'KOSDAQ150' },
] as const

/** 개요 렌즈에서 중심 기업 패널이 다른 렌즈로 건너가는 단축 버튼 */
export interface CenterShortcuts {
  onOpenSupply: () => void
  onOpenEvents: () => void
  /** 0이면 [이벤트 보기]를 비활성 처리한다 */
  eventCount: number
}

interface Props {
  node: GraphNode
  neighbors: NodeNeighbors
  /** 지금 조회의 중심이면 재중심 버튼 대신 '현재 중심'을 보인다 */
  isCenter: boolean
  /** 종목 목록에서 찾은 시세 행 — 없으면 시세 줄을 생략한다 */
  stock?: StockRowRes
  onNodeSelect?: (node: GraphNode) => void
  /** 이 노드를 새 중심으로 다시 조회 */
  onRecenter?: (node: GraphNode) => void
  /** 테마 칩 — 필터로 캔버스에서 꺼져 있을 수 있어 선택이 아니라 테마 그래프로 이동한다 */
  onThemeOpen?: (node: GraphNode) => void
  /** 중심 기업 + 개요 렌즈일 때만 넘어온다 */
  centerShortcuts?: CenterShortcuts
}

/** 이웃 칩 묶음 — 비어 있으면 섹션 자체를 그리지 않는다 */
function NeighborSection({
  title,
  meta,
  nodes,
  onNodeSelect,
}: {
  title: string
  meta?: string
  nodes: GraphNode[]
  onNodeSelect?: (node: GraphNode) => void
}) {
  if (nodes.length === 0) return null
  const shown = nodes.slice(0, MAX_CONNECTED)
  const rest = nodes.length - shown.length
  return (
    <Section title={`${title} (${nodes.length})`} meta={meta}>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((n) => (
          <EntityChip
            key={n.id}
            label={n.label}
            color={nodeColor(n)}
            onClick={onNodeSelect && (() => onNodeSelect(n))}
          />
        ))}
        {rest > 0 && <span className="self-center text-caption text-muted-foreground">+{rest}</span>}
      </div>
    </Section>
  )
}

/**
 * 노드 상세. 기업은 시장·지수·시세와 관계별 이웃(공급처/납품처/인수/투자/테마/이벤트)을, 테마는 설명과 소속 기업을 보인다.
 * 여기서 [중심으로 탐색]을 눌러야 재조회가 일어난다 — 클릭 한 번으로는 정보만 본다.
 */
export function NodeDetail({
  node,
  neighbors,
  isCenter,
  stock,
  onNodeSelect,
  onRecenter,
  onThemeOpen,
  centerShortcuts,
}: Props) {
  const isMobile = useIsMobile()
  const isTheme = node.type === 'theme'
  const ticker = node.data.ticker
  const indexChips = INDEX_FLAGS.filter((f) => node.data[f.key])

  const detailPath = isTheme
    ? `/theme/${encodeURIComponent(node.label)}`
    : ticker
      ? `/stock/${ticker}`
      : null
  const detailAvailable = isTheme || node.data.country === 'KR'
  // 모바일은 hover가 없어 툴팁 대신 버튼 줄 아래에 같은 문구를 상시로 보인다
  const showDetailNotice = detailPath !== null && !detailAvailable && isMobile
  const actionsMargin = isCenter && centerShortcuts ? 'mb-3' : 'mb-5'

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <TypeBadge color={nodeColor(node)}>{CATEGORY_LABELS[nodeCategory(node)]}</TypeBadge>
        {indexChips.map((f) => (
          <Badge key={f.key} variant="secondary" className="rounded-lg font-mono">
            {f.label}
          </Badge>
        ))}
      </div>

      <h2
        className={cn(
          'mt-0 text-xl leading-[1.25] font-semibold tracking-[-0.4px] text-foreground',
          ticker ? 'mb-1' : 'mb-3',
        )}
      >
        {node.label}
      </h2>
      {ticker && <div className="mb-3 font-mono text-caption text-muted-foreground">{ticker}</div>}

      {stock && (
        <div className="mb-4 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-body">
          <span className="font-mono font-semibold text-foreground">
            {formatPriceOrDash(stock.price)}원
          </span>
          <span className={cn('font-mono', changeColorClass(stock.change ?? 0))}>
            {formatChangeOrDash(stock.change)}
          </span>
          <span className="text-caption text-muted-foreground">
            시총 {formatCompactKrw(stock.marketCap)}
          </span>
        </div>
      )}

      {node.data.description && (
        <p className="mt-0 mb-4 text-body leading-relaxed text-foreground-secondary">
          {node.data.description}
        </p>
      )}

      <div className={cn('flex flex-wrap gap-2', showDetailNotice ? 'mb-1.5' : actionsMargin)}>
        {isCenter ? (
          <Button size="sm" className="flex-1" disabled>
            <Crosshair data-icon="inline-start" />
            현재 중심
          </Button>
        ) : (
          onRecenter && (
            <Button size="sm" className="flex-1" onClick={() => onRecenter(node)}>
              <Crosshair data-icon="inline-start" />
              {isTheme ? '이 테마 중심으로 탐색' : '이 기업 중심으로 탐색'}
            </Button>
          )
        )}
        {detailPath &&
          (detailAvailable ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={detailPath}>
                {isTheme ? '테마 상세' : '종목 상세'}
                <ExternalLink data-icon="inline-end" />
              </Link>
            </Button>
          ) : isMobile ? (
            <Button variant="outline" size="sm" disabled>
              종목 상세
              <ExternalLink data-icon="inline-end" />
            </Button>
          ) : (
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                {/* 비활성 버튼은 포인터 이벤트를 받지 않으므로 감싼 span이 hover·focus를 대신 받는다 */}
                <TooltipTrigger asChild>
                  <span tabIndex={0} className="inline-flex rounded-lg outline-none">
                    <Button variant="outline" size="sm" disabled>
                      종목 상세
                      <ExternalLink data-icon="inline-end" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top">{FOREIGN_DETAIL_NOTICE}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
      </div>
      {showDetailNotice && (
        <p className={cn('mt-0 text-caption text-muted-foreground', actionsMargin)}>{FOREIGN_DETAIL_NOTICE}</p>
      )}

      {/* 개요에서 더 깊이 — 공급망은 hop·범위로, 이벤트는 공유 기업으로 이어진다 */}
      {isCenter && centerShortcuts && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={centerShortcuts.onOpenSupply}>
            <Network data-icon="inline-start" />
            공급망 펼치기
          </Button>
          <span
            title={centerShortcuts.eventCount === 0 ? '수집된 이벤트 없음' : undefined}
            className="flex-1"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={centerShortcuts.eventCount === 0}
              onClick={centerShortcuts.onOpenEvents}
            >
              <Newspaper data-icon="inline-start" />
              이벤트 보기
            </Button>
          </span>
        </div>
      )}

      {isTheme ? (
        <NeighborSection title="소속 기업" nodes={neighbors.members} onNodeSelect={onNodeSelect} />
      ) : (
        <>
          {/* 공급 관계는 공급자 → 수요자 방향이다. 들어오는 기업이 공급처, 나가는 기업이 납품처 */}
          <NeighborSection title="공급처" meta="이 기업에 납품" nodes={neighbors.suppliers} onNodeSelect={onNodeSelect} />
          <NeighborSection title="납품처" meta="이 기업이 납품" nodes={neighbors.customers} onNodeSelect={onNodeSelect} />
          <NeighborSection title="인수" meta="이 기업이 인수" nodes={neighbors.acquired} onNodeSelect={onNodeSelect} />
          <NeighborSection title="피인수" meta="이 기업을 인수" nodes={neighbors.acquirers} onNodeSelect={onNodeSelect} />
          <NeighborSection title="투자" meta="이 기업이 투자" nodes={neighbors.investees} onNodeSelect={onNodeSelect} />
          <NeighborSection title="피투자" meta="이 기업에 투자" nodes={neighbors.investors} onNodeSelect={onNodeSelect} />
          {/* 테마는 필터로 꺼져 있을 수 있어 응답 전체(필터 전)에서 채우고, 누르면 테마 그래프로 간다 */}
          <NeighborSection title="소속 테마" nodes={neighbors.themes} onNodeSelect={onThemeOpen ?? onNodeSelect} />
          <NeighborSection title="관련 이벤트" nodes={neighbors.events} onNodeSelect={onNodeSelect} />
        </>
      )}
    </>
  )
}
