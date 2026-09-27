import { useState } from 'react'
import { CircleAlert, ExternalLink, RotateCw } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { SalesRatioCell } from '@/components/stock/ContractSection'
import { Button } from '@/components/ui/button'
import { FilterChip } from '@/components/ui/filter-chip'
import type { RecentContractRes } from '@/lib/apiTypes'
import { formatContractPeriod } from '@/lib/contracts'
import { formatCompactKrw } from '@/lib/format'
import { useRecentContracts, type RecentContractSort } from '@/lib/queries/useRecentContracts'
import { cn } from '@/lib/utils'

const GRID =
  'grid items-center gap-3 grid-cols-[minmax(0,1fr)_88px] sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_104px_136px_36px]'

const SORTS: readonly { key: RecentContractSort; label: string }[] = [
  { key: 'salesRatio', label: '매출 비중순' },
  { key: 'contractAmount', label: '금액순' },
]

const DAYS = 7

function BoardRow({ row, from }: { row: RecentContractRes; from: string }) {
  const period = formatContractPeriod(row.startDate, row.endDate)
  return (
    <div className={cn(GRID, 'min-h-[52px] border-b border-surface-inset py-2')}>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          {row.filerTicker ? (
            <Link
              to={`/stock/${row.filerTicker}`}
              state={{ from }}
              className="truncate text-sm font-semibold text-foreground hover:text-primary"
            >
              {row.filerName}
            </Link>
          ) : (
            <span className="truncate text-sm font-semibold text-foreground">{row.filerName}</span>
          )}
          {row.filerMarket && (
            <span className="shrink-0 text-caption text-muted-foreground">{row.filerMarket}</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-caption text-muted-foreground sm:hidden">
          <span className="mr-1.5 font-mono tabular-nums text-foreground-secondary">
            매출 대비 {row.salesRatio === null ? '—' : `${row.salesRatio.toFixed(1)}%`}
          </span>
          {row.counterpartyName ?? '상대방 미기재'} · <span className="font-mono tabular-nums">{row.rceptDate.slice(5)}</span>
        </p>
      </div>
      <div className="hidden min-w-0 sm:block">
        <p className="truncate text-sm text-foreground">{row.counterpartyName ?? '상대방 미기재'}</p>
        <p className="mt-0.5 truncate text-caption text-muted-foreground" title={row.contractName ?? undefined}>
          <span className="font-mono tabular-nums">{row.rceptDate.slice(5)}</span>
          {row.contractName && <span className="ml-1.5">{row.contractName}</span>}
          {period && <span className="ml-1.5 font-mono tabular-nums">{period}</span>}
        </p>
      </div>
      <span className="text-right font-mono text-sm font-medium tabular-nums text-foreground">
        {formatCompactKrw(row.contractAmount)}
      </span>
      <div className="hidden sm:block">
        <SalesRatioCell ratio={row.salesRatio} />
      </div>
      <a
        href={row.link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="DART 공시 원문 열기"
        className="hidden justify-self-end text-muted-foreground transition-colors hover:text-primary sm:block"
      >
        <ExternalLink className="size-4" strokeWidth={2} />
      </a>
    </div>
  )
}

export function RecentContractsBoard() {
  const { pathname } = useLocation()
  const [sort, setSort] = useState<RecentContractSort>('salesRatio')
  const { data, loading, error, refetch } = useRecentContracts(DAYS, sort)
  const rows = data ?? []

  return (
    <section aria-labelledby="recent-contracts-title">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 id="recent-contracts-title" className="text-lg font-medium tracking-[-0.4px] text-foreground">
            이번 주 큰 계약
          </h2>
          <span className="text-caption text-muted-foreground break-keep">
            최근 {DAYS}일 단일판매·공급계약 공시 · 매출 대비 비율은 제출사 최근 매출액 기준
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {SORTS.map((s) => (
            <FilterChip key={s.key} active={sort === s.key} onClick={() => setSort(s.key)}>
              {s.label}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="card-surface p-5">
        {loading && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        )}
        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <CircleAlert className="size-6 text-muted-foreground" />
            <p className="text-caption text-muted-foreground">
              {error.isRetryable ? '공시 정보를 잠시 불러올 수 없어요.' : '공시 정보를 불러오지 못했어요.'}
            </p>
            {error.isRetryable && (
              <Button variant="outline" size="sm" onClick={refetch}>
                <RotateCw data-icon="inline-start" />
                다시 시도
              </Button>
            )}
          </div>
        )}
        {!loading && !error && rows.length === 0 && (
          <p className="py-8 text-center text-caption text-muted-foreground">
            최근 {DAYS}일 안에 접수된 공급계약 공시가 없어요.
          </p>
        )}
        {!loading && !error && rows.length > 0 && (
          <>
            <div className={cn(GRID, 'border-b border-border pb-1.5 text-caption text-muted-foreground')}>
              <span>종목</span>
              <span className="hidden sm:block">상대방 · 계약</span>
              <span className="text-right">계약금액</span>
              <span className="hidden sm:block">매출 대비</span>
              <span className="hidden sm:block" />
            </div>
            {rows.map((row) => (
              <BoardRow key={row.rceptNo} row={row} from={pathname} />
            ))}
          </>
        )}
      </div>
    </section>
  )
}
