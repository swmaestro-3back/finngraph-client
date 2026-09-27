import { useMemo } from 'react'
import { CircleAlert, ExternalLink, RotateCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { StockContractRes } from '@/lib/apiTypes'
import {
  formatContractPeriod,
  formatSalesRatio,
  ratioBarWidth,
  summarizeContracts,
} from '@/lib/contracts'
import { formatCompactKrw } from '@/lib/format'
import { useStockContracts } from '@/lib/queries/useStockContracts'
import { cn } from '@/lib/utils'

const GRID =
  'grid items-center gap-3 grid-cols-[minmax(0,1fr)_88px] sm:grid-cols-[64px_minmax(0,1fr)_104px_136px_36px]'

const ROLE_LABEL: Record<StockContractRes['role'], string> = {
  FILER: '수주',
  COUNTERPARTY: '발주',
}

interface ContractSectionProps {
  ticker: string
  referenceDate: string | null
  from: string
  className?: string
}

export function SalesRatioCell({ ratio, muted = false }: { ratio: number | null; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden
        className="hidden h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-surface-inset sm:block"
      >
        <span
          className={cn('block h-full rounded-full', muted ? 'bg-foreground-tertiary' : 'bg-chart-1')}
          style={{ width: `${ratioBarWidth(ratio)}%` }}
        />
      </span>
      <span
        className={cn(
          'font-mono text-sm font-medium tabular-nums',
          ratio !== null && ratio >= 50 ? 'text-foreground' : 'text-foreground-secondary',
        )}
      >
        {formatSalesRatio(ratio)}
      </span>
    </div>
  )
}

function ContractRow({ row, from }: { row: StockContractRes; from: string }) {
  const period = formatContractPeriod(row.startDate, row.endDate)
  const counterparty = row.counterpartyName ?? '상대방 미기재'
  return (
    <div className={cn(GRID, 'min-h-[52px] border-b border-surface-inset py-2')}>
      <span className="hidden font-mono text-caption tabular-nums text-muted-foreground sm:block">
        {row.rceptDate.slice(5)}
      </span>
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'shrink-0 rounded px-1.5 py-px text-caption font-medium',
              row.role === 'FILER'
                ? 'bg-chart-1/12 text-chart-1'
                : 'bg-surface-inset text-foreground-secondary',
            )}
          >
            {ROLE_LABEL[row.role]}
          </span>
          {row.counterpartyTicker ? (
            <Link
              to={`/stock/${row.counterpartyTicker}`}
              state={{ from }}
              className="truncate text-sm font-semibold text-foreground hover:text-primary"
            >
              {counterparty}
            </Link>
          ) : (
            <span className="truncate text-sm font-semibold text-foreground">{counterparty}</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-caption text-muted-foreground" title={row.contractName ?? undefined}>
          <span className="mr-1.5 font-mono tabular-nums sm:hidden">{row.rceptDate.slice(5)}</span>
          <span className="mr-1.5 font-mono tabular-nums text-foreground-secondary sm:hidden">
            매출 대비 {formatSalesRatio(row.salesRatio)}
          </span>
          {row.contractName ?? row.contractType ?? row.reportName}
          {period && <span className="ml-1.5 font-mono tabular-nums">{period}</span>}
          {row.isCorrection && <span className="ml-1.5 text-accent-warm">정정</span>}
        </p>
      </div>
      <span className="text-right font-mono text-sm font-medium tabular-nums text-foreground">
        {formatCompactKrw(row.contractAmount)}
      </span>
      <div className="hidden sm:block">
        <SalesRatioCell ratio={row.salesRatio} muted={row.role === 'COUNTERPARTY'} />
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

export function ContractSection({ ticker, referenceDate, from, className }: ContractSectionProps) {
  const { data, loading, error, refetch } = useStockContracts(ticker)
  const rows = useMemo(() => data ?? [], [data])
  const summary = useMemo(() => summarizeContracts(rows, referenceDate), [rows, referenceDate])

  return (
    <section aria-labelledby="contract-section-title">
      <div className={cn('flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1', className)}>
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h2 id="contract-section-title" className="text-lg font-medium tracking-[-0.4px] text-foreground">
            공급계약 공시
          </h2>
          <span className="text-caption text-muted-foreground break-keep">
            DART 단일판매·공급계약 · 매출 대비 비율은 제출사의 최근 매출액 기준
          </span>
        </div>
        {rows.length > 0 && (
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-caption text-muted-foreground">
            <div className="flex items-baseline gap-1.5">
              <dt>최근 1년</dt>
              <dd className="font-mono font-medium tabular-nums text-foreground">{summary.count}건</dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt>수주 합계</dt>
              <dd className="font-mono font-medium tabular-nums text-foreground">
                {summary.wonCount > 0 ? formatCompactKrw(summary.wonAmount) : '—'}
              </dd>
            </div>
            <div className="flex items-baseline gap-1.5">
              <dt>최대 매출 대비</dt>
              <dd className="font-mono font-medium tabular-nums text-foreground">
                {formatSalesRatio(summary.maxSalesRatio)}
              </dd>
            </div>
          </dl>
        )}
      </div>

      <div className="card-surface p-5">
        {loading && (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
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
          <div className="flex flex-col items-center gap-1.5 py-8 text-center">
            <p className="text-body font-medium text-foreground">공급계약 공시가 없어요</p>
            <p className="max-w-[44ch] text-caption leading-relaxed text-muted-foreground break-keep">
              단일판매·공급계약체결 공시가 접수되면 여기에 계약 규모와 매출 대비 비율이 표시됩니다.
            </p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <>
            <div className={cn(GRID, 'border-b border-border pb-1.5 text-caption text-muted-foreground')}>
              <span className="hidden sm:block">공시일</span>
              <span>상대방 · 계약</span>
              <span className="text-right">계약금액</span>
              <span className="hidden sm:block">매출 대비</span>
              <span className="hidden sm:block" />
            </div>
            {rows.map((row) => (
              <ContractRow key={row.rceptNo} row={row} from={from} />
            ))}
          </>
        )}
      </div>
    </section>
  )
}
