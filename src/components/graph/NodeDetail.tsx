import { ArrowRight, Crosshair, ExternalLink, Network, Newspaper } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import {
  CATEGORY_LABELS,
  nodeCategory,
  type GraphLink,
  type GraphNode,
} from '@/data/graphTypes'
import type { StockRowRes, ThemeRes } from '@/lib/apiTypes'
import type { Neighbor, NodeNeighbors } from '@/lib/graphNeighbors'
import { formatCompactKrw, formatPriceOrDash, formatShortDate } from '@/lib/format'
import { itemsLine } from '@/lib/edgeEvidence'
import {
  CategoryDot,
  ChangeText,
  LEDGER_ROW,
  Ledger,
  NodeMark,
  RowAction,
  Section,
} from '@/components/graph/DetailParts'
import { StockLogo } from '@/components/stock/StockLogo'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useIsMobile } from '@/hooks/use-mobile'
import { fromState } from '@/lib/navigation'
import { useThemeIdIndex } from '@/lib/queries/useThemesCached'
import { themeDetailPath } from '@/lib/themeRoute'
import { cn } from '@/lib/utils'

/** 테마의 소속 기업은 수십 곳일 수 있다 — 처음에는 이만큼만 편다 */
const MAX_MEMBERS = 8

/** 종목 상세 페이지는 국내 상장사(country=KR)만 있다 — 해외 기업은 버튼을 비활성 처리하고 이 문구로 안내한다 */
const FOREIGN_DETAIL_NOTICE = '해외 기업 종목 상세는 준비 중입니다'

/** 지수 편입 플래그 → 표기 */
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
  /** 지금 조회의 중심 노드 id — 선택 노드가 중심인지, 이웃 가운데 누가 중심인지 가린다 */
  centerId: string | null
  /** 종목 목록의 시세 행 — 선택 기업과 이웃 기업의 등락을 여기서 찾는다(없으면 생략) */
  stockByTicker: Map<string, StockRowRes>
  /** 테마 목록 — 테마의 오늘 등락을 이름으로 찾는다 */
  themeByName: Map<string, ThemeRes>
  onNodeSelect?: (node: GraphNode) => void
  /** 이웃 행의 면을 누르면 그 관계(간선)의 출처로 간다 */
  onLinkSelect?: (link: GraphLink) => void
  /** 이웃 행에 올리면 캔버스에서 그 간선을 켠다 — 떠나면 null */
  onLinkHover?: (linkId: string | null) => void
  /** 이 노드를 새 중심으로 다시 조회 */
  onRecenter?: (node: GraphNode) => void
  /** 소속 테마 행 — 필터로 캔버스에서 꺼져 있을 수 있어 선택이 아니라 테마 그래프로 이동한다 */
  onThemeOpen?: (node: GraphNode) => void
  /** 중심 기업 + 개요 렌즈일 때만 넘어온다 */
  centerShortcuts?: CenterShortcuts
}

/** 지분 관계 한 행 — 이웃과 함께, 선택 기업에서 본 방향을 문장으로 든다 */
interface EquityRow extends Neighbor {
  direction: string
}

/** 근거가 많은 관계가 위로. 중심 기업과의 관계는 언제나 맨 위 — 이 노드가 화면에 있는 이유다 */
function byWeight(centerId: string | null) {
  return (a: Neighbor, b: Neighbor) =>
    Number(b.node.id === centerId) - Number(a.node.id === centerId) ||
    b.link.mentioned_count - a.link.mentioned_count
}

/**
 * 노드 상세. 기업은 시세와 관계 장부(공급처·납품처·지분·테마·이벤트)를, 테마는 설명과 소속 기업을 보인다.
 * 이웃은 칩이 아니라 행이다 — 한 줄이 상대, 무엇을, 근거 몇 건, 마지막 언급을 말한다.
 * 여기서 [중심으로 탐색]을 눌러야 재조회가 일어난다 — 클릭 한 번으로는 정보만 본다.
 */
export function NodeDetail({
  node,
  neighbors,
  centerId,
  stockByTicker,
  themeByName,
  onNodeSelect,
  onLinkSelect,
  onLinkHover,
  onRecenter,
  onThemeOpen,
  centerShortcuts,
}: Props) {
  const isMobile = useIsMobile()
  const { pathname, search } = useLocation()
  const isTheme = node.type === 'theme'
  const isCenter = node.id === centerId
  const ticker = node.data.ticker
  const stock = ticker ? stockByTicker.get(ticker) : undefined
  const theme = isTheme ? themeByName.get(node.label) : undefined
  const indexFlags = INDEX_FLAGS.filter((f) => node.data[f.key])
  // 기업은 1주·1개월·3개월을 종목 목록에서, 테마는 테마 목록에서 읽는다 — 둘 다 같은 필드 이름이다
  const returns = [
    { label: '1주', value: (stock ?? theme)?.w1 },
    { label: '1개월', value: (stock ?? theme)?.m1 },
    { label: '3개월', value: (stock ?? theme)?.m3 },
  ].filter((r) => r.value != null)

  const themeIndex = useThemeIdIndex()
  const themePath = isTheme ? themeDetailPath(node.label, themeIndex) : null

  const detailPath = isTheme ? themePath : ticker ? `/stock/${ticker}` : null
  const detailAvailable = isTheme || node.data.country === 'KR'
  // 모바일은 hover가 없어 툴팁 대신 버튼 줄 아래에 같은 문구를 상시로 보인다
  const showDetailNotice = detailPath !== null && !detailAvailable && isMobile
  const actionsMargin = isCenter && centerShortcuts ? 'mb-3' : 'mb-5'

  const sort = byWeight(centerId)
  const suppliers = [...neighbors.suppliers].sort(sort)
  const customers = [...neighbors.customers].sort(sort)
  // 인수·피인수·투자·피투자는 한 묶음으로 — 방향은 행의 둘째 줄이 말한다
  const equity: EquityRow[] = [
    ...neighbors.acquired.map((n) => ({ ...n, direction: '이 기업이 인수' })),
    ...neighbors.acquirers.map((n) => ({ ...n, direction: '이 기업을 인수' })),
    ...neighbors.investees.map((n) => ({ ...n, direction: '이 기업이 투자' })),
    ...neighbors.investors.map((n) => ({ ...n, direction: '이 기업에 투자' })),
  ].sort(sort)
  const events = [...neighbors.events].sort((a, b) =>
    (b.node.data.lastPublishedAt ?? '').localeCompare(a.node.data.lastPublishedAt ?? ''),
  )
  const hasSupply = suppliers.length + customers.length > 0

  /** 기업 이웃 한 행 — 이름은 그 기업으로, 나머지 면은 관계 근거로 */
  const relationRow = (n: Neighbor, detail: string | undefined) => {
    const neighborStock = n.node.data.ticker ? stockByTicker.get(n.node.data.ticker) : undefined
    return (
      <li
        className={cn(LEDGER_ROW, 'flex items-start gap-2.5')}
        onMouseEnter={onLinkHover && (() => onLinkHover(n.link.id))}
        onMouseLeave={onLinkHover && (() => onLinkHover(null))}
      >
        <NodeMark node={n.node} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {onNodeSelect ? (
              <button
                type="button"
                onClick={() => onNodeSelect(n.node)}
                className="relative z-10 min-w-0 cursor-pointer truncate text-body font-semibold text-foreground hover:underline"
              >
                {n.node.label}
              </button>
            ) : (
              <span className="min-w-0 truncate text-body font-semibold text-foreground">
                {n.node.label}
              </span>
            )}
            {n.node.id === centerId && (
              <span className="shrink-0 text-micro font-semibold text-primary">중심</span>
            )}
            <ChangeText value={neighborStock?.change} className="shrink-0 text-caption" />
            <span className="ml-auto shrink-0 font-mono text-caption text-muted-foreground">
              <span className="text-foreground">{n.link.mentioned_count}</span>
              {n.link.last_mentioned_at && ` ${formatShortDate(n.link.last_mentioned_at)}`}
            </span>
          </div>
          {detail && <p className="m-0 mt-0.5 truncate text-caption text-muted-foreground">{detail}</p>}
        </div>
        {onLinkSelect && (
          <RowAction
            label={`${n.node.label} 관계 출처 보기`}
            onClick={() => onLinkSelect(n.link)}
          />
        )}
      </li>
    )
  }

  const supplyRow = (n: Neighbor) => relationRow(n, itemsLine(n.link))

  return (
    <>
      {/* 로고가 없는 종목은 자리를 비우지 않고 이름만 왼쪽으로 붙는다 */}
      <div className="mb-3 flex items-center gap-2.5">
        {ticker && <StockLogo ticker={ticker} size={36} />}
        <div className="min-w-0">
          <h2 className="m-0 text-xl leading-[1.25] font-semibold tracking-[-0.4px] text-foreground">
            {node.label}
          </h2>
          {/* 테마는 패널 맨 윗줄이 이미 "테마"라고 말한다 — 기업만 티커·시장·지수 줄을 둔다 */}
          {!isTheme && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-caption text-muted-foreground">
              {ticker && <span>{ticker}</span>}
              <span className="inline-flex items-center gap-1">
                <CategoryDot node={node} />
                {CATEGORY_LABELS[nodeCategory(node)]}
              </span>
              {indexFlags.map((f) => (
                <span key={f.key}>{f.label}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {(stock || theme) && (
        <div className="mb-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-body">
            {stock && (
              <span className="font-mono font-semibold text-foreground">
                {formatPriceOrDash(stock.price)}원
              </span>
            )}
            <ChangeText value={(stock ?? theme)?.change} />
            <span className="text-caption text-muted-foreground">
              시총 {formatCompactKrw((stock ?? theme)?.marketCap ?? null)}
            </span>
          </div>
          {returns.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-x-3 text-caption text-muted-foreground">
              {returns.map((r) => (
                <span key={r.label}>
                  {r.label} <ChangeText value={r.value} />
                </span>
              ))}
            </div>
          )}
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
              <Link to={detailPath} state={fromState(`${pathname}${search}`)}>
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
        neighbors.members.length > 0 && (
          <Section title={`소속 기업 ${neighbors.members.length}`} meta="오늘 등락">
            <Ledger items={neighbors.members} keyOf={(n) => n.node.id} max={MAX_MEMBERS}>
              {(n) => (
                <li className={cn(LEDGER_ROW, 'flex items-start gap-2.5')}>
                  <NodeMark node={n.node} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="min-w-0 truncate text-body font-semibold text-foreground">
                        {n.node.label}
                      </span>
                      <ChangeText
                        value={n.node.data.ticker ? stockByTicker.get(n.node.data.ticker)?.change : undefined}
                        className="ml-auto shrink-0 text-caption"
                      />
                    </div>
                    {/* 편입 사유 — 왜 이 테마에 묶였는지가 테마주 목록의 본문이다 */}
                    {n.link.reason && (
                      <p className="m-0 mt-0.5 line-clamp-2 text-caption leading-snug text-muted-foreground">
                        {n.link.reason}
                      </p>
                    )}
                  </div>
                  {onNodeSelect && (
                    <RowAction label={`${n.node.label} 선택`} onClick={() => onNodeSelect(n.node)} />
                  )}
                </li>
              )}
            </Ledger>
          </Section>
        )
      ) : (
        <>
          {/* 공급 관계는 공급자 → 수요자 방향이다. 들어오는 기업이 공급처, 나가는 기업이 납품처 — 띠가 그 방향을 그린다 */}
          {hasSupply && (
            <div className="mb-5">
              <div className="grid grid-cols-[1fr_auto_1.4fr_auto_1fr] items-center gap-1.5 rounded-md bg-surface-inset px-3 py-2.5 text-center">
                <FlowEnd count={suppliers.length} label="공급처" />
                <ArrowRight className="size-3.5 text-muted-foreground" strokeWidth={2} />
                <span className="truncate text-caption font-semibold text-foreground">{node.label}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" strokeWidth={2} />
                <FlowEnd count={customers.length} label="납품처" />
              </div>
              {/* 중심이 아닌 기업은 이웃 일부만 화면에 있다 — 반쪽 숫자를 전부인 것처럼 읽지 않도록 */}
              {!isCenter && (
                <p className="mt-1.5 mb-0 text-caption text-muted-foreground">
                  지금 그래프에 보이는 연결만 셉니다. 전체는 이 기업을 중심으로 옮겨서 보세요.
                </p>
              )}
            </div>
          )}

          {suppliers.length > 0 && (
            <Section title={`공급처 ${suppliers.length}`} meta="출처 · 최근 언급">
              <Ledger items={suppliers} keyOf={(n) => n.node.id}>
                {supplyRow}
              </Ledger>
            </Section>
          )}
          {customers.length > 0 && (
            <Section title={`납품처 ${customers.length}`} meta="출처 · 최근 언급">
              <Ledger items={customers} keyOf={(n) => n.node.id}>
                {supplyRow}
              </Ledger>
            </Section>
          )}
          {equity.length > 0 && (
            <Section title={`지분 관계 ${equity.length}`} meta="출처 · 최근 언급">
              <Ledger items={equity} keyOf={(n) => n.link.id}>
                {(n) => relationRow(n, n.direction)}
              </Ledger>
            </Section>
          )}

          {/* 테마는 필터로 꺼져 있을 수 있어 응답 전체(필터 전)에서 채우고, 누르면 테마 그래프로 간다 */}
          {neighbors.themes.length > 0 && (
            <Section title={`소속 테마 ${neighbors.themes.length}`} meta="오늘 등락">
              <Ledger items={neighbors.themes} keyOf={(n) => n.node.id} unit="개">
                {(n) => (
                  <li className={LEDGER_ROW}>
                    <div className="flex items-baseline gap-2">
                      <CategoryDot node={n.node} className="self-center" />
                      <span className="min-w-0 truncate text-body font-semibold text-foreground">
                        {n.node.label}
                      </span>
                      <ChangeText
                        value={themeByName.get(n.node.label)?.change}
                        className="ml-auto shrink-0 text-caption"
                      />
                    </div>
                    {n.link.reason && (
                      <p className="m-0 mt-0.5 line-clamp-2 text-caption leading-snug text-muted-foreground">
                        {n.link.reason}
                      </p>
                    )}
                    {(onThemeOpen ?? onNodeSelect) && (
                      <RowAction
                        label={`${n.node.label} 테마 그래프로 이동`}
                        onClick={() => (onThemeOpen ?? onNodeSelect)?.(n.node)}
                      />
                    )}
                  </li>
                )}
              </Ledger>
            </Section>
          )}

          {events.length > 0 && (
            <Section title={`최근 이벤트 ${events.length}`}>
              <Ledger items={events} keyOf={(n) => n.node.id} unit="건">
                {(n) => (
                  <li className={cn(LEDGER_ROW, 'flex gap-2.5')}>
                    <span className="w-9 shrink-0 pt-px font-mono text-caption text-muted-foreground">
                      {formatShortDate(n.node.data.lastPublishedAt)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="m-0 line-clamp-2 text-body leading-snug text-foreground">
                        {n.node.label}
                      </p>
                      {n.node.data.memberCount != null && (
                        <p className="m-0 mt-0.5 text-caption text-muted-foreground">
                          뉴스 {n.node.data.memberCount}건
                        </p>
                      )}
                    </div>
                    {onNodeSelect && (
                      <RowAction label={`${n.node.label} 이벤트 보기`} onClick={() => onNodeSelect(n.node)} />
                    )}
                  </li>
                )}
              </Ledger>
            </Section>
          )}
        </>
      )}
    </>
  )
}

/** 흐름 띠의 한쪽 끝 — 건수와 이름 */
function FlowEnd({ count, label }: { count: number; label: string }) {
  return (
    <div className={cn(count === 0 && 'text-muted-foreground')}>
      <div className="font-mono text-base leading-tight font-semibold">{count}</div>
      <div className="text-caption text-muted-foreground">{label}</div>
    </div>
  )
}
