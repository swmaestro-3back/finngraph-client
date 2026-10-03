import { Fragment, useState, type ReactNode } from 'react'
import { nodeColor, type GraphNode } from '@/data/graphTypes'
import { StockLogo } from '@/components/stock/StockLogo'
import { changeColorClass, formatChange } from '@/lib/format'
import { cn } from '@/lib/utils'

/** 상세 패널의 소제목 + 본문 묶음. meta는 소제목 오른쪽 끝에 붙는 부가 정보(열 머리글·건수) */
export function Section({
  title,
  meta,
  children,
}: {
  title: string
  meta?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h4 className="m-0 text-caption font-semibold tracking-[0.4px] text-muted-foreground">
          {title}
        </h4>
        {meta && <span className="text-caption text-muted-foreground">{meta}</span>}
      </div>
      {children}
    </div>
  )
}

/** 노드 분류 색 점 — 캔버스의 노드 색과 같은 색이라 패널의 글자와 캔버스의 점이 이어진다 */
export function CategoryDot({ node, className }: { node: GraphNode; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-2 shrink-0 rounded-full', className)}
      style={{ background: nodeColor(node) }}
    />
  )
}

/**
 * 행 맨 앞의 표식 — 티커가 있는 기업은 로고(국내·해외 모두), 로고가 없거나 테마·이벤트면 분류 색 점.
 * 어느 쪽이든 같은 너비를 차지해 행의 글자 시작점이 맞는다.
 */
export function NodeMark({ node, size = 24 }: { node: GraphNode; size?: number }) {
  const dot = (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface-inset"
      style={{ width: size, height: size }}
    >
      <CategoryDot node={node} />
    </span>
  )
  const ticker = node.data.ticker
  if (node.type !== 'company' || !ticker) return dot
  return <StockLogo ticker={ticker} size={size} fallback={dot} />
}

/**
 * 그래프에 없는 기업의 표식 — 이름으로 종목을 찾았으면 로고, 못 찾았거나 로고가 없으면 이름 첫 글자.
 * 빈 원으로 두면 아이콘이 깨진 것처럼 보인다.
 */
export function NameMark({
  name,
  ticker,
  size = 24,
}: {
  name: string
  ticker?: string
  size?: number
}) {
  const initial = (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-surface-inset text-caption font-semibold text-muted-foreground"
      style={{ width: size, height: size }}
    >
      {name.trim().charAt(0)}
    </span>
  )
  return ticker ? <StockLogo ticker={ticker} size={size} fallback={initial} /> : initial
}

/** 등락률 — 값이 없으면 아무것도 그리지 않는다(해외 기업·시세 미수집) */
export function ChangeText({
  value,
  className,
}: {
  value: number | null | undefined
  className?: string
}) {
  if (value == null) return null
  return <span className={cn('font-mono', changeColorClass(value), className)}>{formatChange(value)}</span>
}

/** 장부 행 하나의 틀 — 위 헤어라인, 호버 면. 행 전체를 덮는 버튼은 RowAction으로 얹는다 */
export const LEDGER_ROW = 'relative -mx-2 border-t border-border px-2 py-2.5 hover:bg-muted'

/**
 * 행 전체를 덮는 투명 버튼. 행 안의 다른 버튼(기업 이름)은 `relative z-10`으로 이 위에 올린다 —
 * 이름은 그 기업으로, 나머지 면은 이 동작으로 간다.
 */
export function RowAction({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="absolute inset-0 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
    />
  )
}

/**
 * 장부 — 행을 max개까지만 보이고 나머지는 [N곳 더 보기]로 편다.
 * children이 `<li>`를 통째로 그린다(행마다 얹는 동작이 달라서).
 */
export function Ledger<T>({
  items,
  keyOf,
  max = 5,
  unit = '곳',
  children,
}: {
  items: T[]
  keyOf: (item: T) => string
  max?: number
  /** 더 보기 버튼의 단위 — "3곳 더 보기", "5건 더 보기" */
  unit?: string
  children: (item: T) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const shown = open ? items : items.slice(0, max)
  const rest = items.length - shown.length
  return (
    <>
      <ul className="m-0 list-none p-0">
        {shown.map((item) => (
          <Fragment key={keyOf(item)}>{children(item)}</Fragment>
        ))}
      </ul>
      {rest > 0 && <MoreButton onClick={() => setOpen(true)}>{`${rest}${unit} 더 보기`}</MoreButton>}
    </>
  )
}

export function MoreButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="-mx-2 block w-[calc(100%+1rem)] cursor-pointer border-t border-border px-2 py-2 text-center text-caption text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  )
}

/** 제목을 불러오는 동안의 자리 — 행 높이를 미리 잡아 도착했을 때 목록이 튀지 않는다 */
export function RowSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-hidden className="border-t border-border">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-2.5 border-b border-border py-3 last:border-b-0">
          <div className="h-3.5 w-9 animate-pulse rounded bg-muted" />
          <div className="h-3.5 flex-1 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )
}
