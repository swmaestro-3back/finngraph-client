import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/fg/Button'
import { FilterChipGroup } from '@/components/fg/FilterChip'
import { Skeleton } from '@/components/fg/Skeleton'
import { StateBlock } from '@/components/fg/StateBlock'
import type { RecentContractRes } from '@/lib/apiTypes'
import { formatSalesRatio } from '@/lib/contracts'
import { marketLabel } from '@/lib/fg/format'
import { stockPath } from '@/lib/fg/paths'
import { formatCompactKrw } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { awaiting } from '@/lib/queries/useApi'
import { useRecentContracts, type RecentContractSort } from '@/lib/queries/useRecentContracts'
import { formatMonthDay } from '@/lib/themeMetrics'
import { cn } from '@/lib/utils'

const SORTS: readonly { value: RecentContractSort; label: string }[] = [
  { value: 'salesRatio', label: '매출 비중순' },
  { value: 'contractAmount', label: '금액순' },
]

const DAYS = 7
const PREVIEW = 5
const HIGH_RATIO = 50
const LIST_ID = 'recent-contracts-list'

function counterpartyOf(row: RecentContractRes): string {
  return row.counterpartyName ?? '상대방 미기재'
}

function dealOf(row: RecentContractRes): string | null {
  return row.contractName ?? row.contractType
}

function Filer({ row, from }: { row: RecentContractRes; from: string }) {
  return (
    <span className="fg-cal-ctr__filer">
      {row.filerTicker ? (
        <Link to={stockPath(row.filerTicker)} state={fromState(from)} className="fg-cal-ctr__name">
          {row.filerName}
        </Link>
      ) : (
        <span className="fg-cal-ctr__name">{row.filerName}</span>
      )}
      {row.filerMarket && <span className="fg-cal-ctr__mkt">{marketLabel(row.filerMarket)}</span>}
    </span>
  )
}

function ContractCard({ row, from }: { row: RecentContractRes; from: string }) {
  const deal = dealOf(row)
  return (
    <li className="fg-cal-ctr__item">
      <span className="fg-cal-ctr__top">
        <Filer row={row} from={from} />
        <span className="fg-cal-ctr__amount fg-num">{formatCompactKrw(row.contractAmount)}</span>
      </span>
      <span className="fg-cal-ctr__party" title={deal ?? undefined}>
        {deal ? `${counterpartyOf(row)} · ${deal}` : counterpartyOf(row)}
      </span>
      <span className="fg-cal-ctr__meta">
        <span className={cn('fg-num', row.salesRatio !== null && row.salesRatio >= HIGH_RATIO && 'fg-cal-ctr__ratio--high')}>
          매출 대비 {formatSalesRatio(row.salesRatio)}
        </span>
        <span aria-hidden="true">·</span>
        <a
          href={row.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${formatMonthDay(row.rceptDate)} ${row.filerName} 공시 원문, 새 창`}
          className="fg-cal-ctr__date"
        >
          <span className="fg-num">{formatMonthDay(row.rceptDate)}</span>
          <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
        </a>
      </span>
    </li>
  )
}

interface RecentContractsBoardProps {
  from: string
  className?: string
}

export function RecentContractsBoard({ from, className }: RecentContractsBoardProps) {
  const [sort, setSort] = useState<RecentContractSort>('salesRatio')
  const [expanded, setExpanded] = useState(false)
  const state = useRecentContracts(DAYS, sort)
  const { data, loading, error, refetch } = state
  const pending = loading || awaiting(state)
  const rows = data ?? []
  const shown = expanded ? rows : rows.slice(0, PREVIEW)
  const collapsible = rows.length > PREVIEW

  return (
    <section aria-labelledby="recent-contracts-title" className={cn('fg-section fg-cal-ctr', className)}>
      <div>
        <h2 id="recent-contracts-title" className="fg-section__title">
          이번 주 큰 계약
        </h2>
        <p className="fg-cal-ctr__desc">
          최근 {DAYS}일 단일판매·공급계약 공시 · 매출 대비 비율은 제출사 최근 매출액 기준
        </p>
      </div>

      <FilterChipGroup label="큰 계약 정렬" options={SORTS} value={sort} onChange={setSort} />

      {pending && (
        <div className="fg-cal-ctr__skel" aria-hidden="true">
          <Skeleton height={48} />
          <Skeleton height={48} />
          <Skeleton height={48} />
        </div>
      )}

      {!pending && error && (
        <StateBlock
          kind="error"
          title={error.isRetryable ? '공시 정보를 잠시 불러올 수 없어요.' : '공시 정보를 불러오지 못했어요.'}
          action={
            error.isRetryable ? (
              <Button size="sm" onClick={refetch}>
                다시 시도
              </Button>
            ) : undefined
          }
          className="fg-cal-ctr__state"
        />
      )}

      {!pending && !error && rows.length === 0 && (
        <StateBlock
          kind="empty"
          title={`최근 ${DAYS}일 안에 접수된 공급계약 공시가 없어요.`}
          className="fg-cal-ctr__state"
        />
      )}

      {!pending && !error && rows.length > 0 && (
        <>
          <ul id={LIST_ID} className="fg-cal-ctr__list">
            {shown.map((row) => (
              <ContractCard key={row.rceptNo} row={row} from={from} />
            ))}
          </ul>
          {collapsible && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={LIST_ID}
              onClick={() => setExpanded((open) => !open)}
              className="fg-cal-ctr__more"
            >
              {expanded ? '접기' : `큰 계약 ${rows.length}건 모두 보기`}
              {expanded ? (
                <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />
              ) : (
                <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
              )}
            </button>
          )}
        </>
      )}
    </section>
  )
}
