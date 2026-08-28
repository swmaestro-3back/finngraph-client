import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SortableHeaderRow, type TableColumn } from '@/components/table/SortableHeaderRow'
import { StockIdentity } from '@/components/table/StockIdentity'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { stockListRows, type StockListRow } from '@/data/stockList'
import { changeColorClass, formatAmount, formatChange, formatPrice } from '@/lib/format'
import { fromState } from '@/lib/navigation'
import { useTableSort } from '@/lib/useTableSort'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

const GRID =
  'grid grid-cols-[36px_minmax(150px,1.6fr)_92px_70px_66px_66px_66px_90px_58px_54px_60px_62px_minmax(70px,1fr)] items-center gap-2'

type SortKey =
  | 'name'
  | 'change'
  | 'w1'
  | 'm1'
  | 'm3'
  | 'marketCap'
  | 'per'
  | 'pbr'
  | 'roe'
  | 'dividendYield'

const COLUMNS: TableColumn<SortKey>[] = [
  { key: null, label: '#', align: 'left' },
  { key: 'name', label: '종목명', align: 'left' },
  { key: null, label: '현재가', align: 'right' },
  { key: 'change', label: '등락률', align: 'right' },
  { key: 'w1', label: '1주', align: 'right' },
  { key: 'm1', label: '1개월', align: 'right' },
  { key: 'm3', label: '3개월', align: 'right' },
  { key: 'marketCap', label: '시가총액 (억)', align: 'right' },
  { key: 'per', label: 'PER', align: 'right' },
  { key: 'pbr', label: 'PBR', align: 'right' },
  { key: 'roe', label: 'ROE', align: 'right' },
  { key: 'dividendYield', label: '배당률', align: 'right' },
  { key: null, label: '테마', align: 'right' },
]

export default function StockListPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [page, setPage] = useState(1)
  const { sorted, sortKey, sortDesc, handleSort } = useTableSort<StockListRow, SortKey>(
    stockListRows,
    'w1',
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const sortBy = (key: SortKey) => {
    handleSort(key)
    setPage(1)
  }

  const goToPage = (next: number) => {
    setPage(Math.min(totalPages, Math.max(1, next)))
    window.scrollTo(0, 0)
  }

  const pageNumbers = useMemo(() => {
    const window_ = 3
    const start = Math.max(1, Math.min(page - window_, totalPages - window_ * 2))
    const end = Math.min(totalPages, Math.max(page + window_, window_ * 2 + 1))
    const list: number[] = []
    for (let n = start; n <= end; n++) list.push(n)
    return list
  }, [page, totalPages])

  return (
    <div className="page-container pb-12 pt-7">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-[9px]">
          <h1 className="text-display font-medium leading-[1.1] tracking-[-0.8px] text-foreground">
            주식 목록
          </h1>
          <span className="text-body text-muted-foreground">
            전체 {stockListRows.length}개 종목 · 2026-07-31 기준
          </span>
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="min-w-[1140px]">
            <SortableHeaderRow
              columns={COLUMNS}
              sortKey={sortKey}
              sortDesc={sortDesc}
              onSort={sortBy}
              className={cn(GRID, 'border-b border-border bg-muted px-4 py-2.5')}
            />

            {pageRows.map((row, index) => (
              <button
                key={row.code}
                type="button"
                onClick={() => navigate(`/stock/${row.code}`, { state: fromState(pathname) })}
                className={cn(
                  GRID,
                  'w-full cursor-pointer border-b border-surface-inset px-4 py-2 text-left hover:bg-muted',
                  index % 2 === 1 && 'bg-foreground/[0.016]',
                )}
              >
                <span className="font-mono text-caption leading-[1.4] text-foreground-tertiary">
                  {(page - 1) * PAGE_SIZE + index + 1}
                </span>
                <StockIdentity name={row.name} code={row.code} market={row.market} />
                <span className="text-right font-mono text-sm font-medium text-foreground">
                  {formatPrice(row.price)}
                </span>
                {(['change', 'w1', 'm1', 'm3'] as const).map((key) => (
                  <span
                    key={key}
                    className={cn(
                      'text-right font-mono text-xs font-medium leading-[1.4]',
                      changeColorClass(row[key]),
                    )}
                  >
                    {formatChange(row[key])}
                  </span>
                ))}
                <span className="text-right font-mono text-xs text-foreground">
                  {formatAmount(row.marketCap)}
                </span>
                <span className="text-right font-mono text-xs leading-[1.4] text-muted-foreground">
                  {row.per.toFixed(2)}
                </span>
                <span className="text-right font-mono text-xs leading-[1.4] text-muted-foreground">
                  {row.pbr.toFixed(2)}
                </span>
                <span className="text-right font-mono text-xs leading-[1.4] text-muted-foreground">
                  {row.roe.toFixed(1)}%
                </span>
                <span className="text-right font-mono text-xs leading-[1.4] text-muted-foreground">
                  {row.dividendYield.toFixed(2)}%
                </span>
                <span className="overflow-hidden text-right text-caption whitespace-nowrap text-ellipsis text-muted-foreground">
                  {row.themeName}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <Pagination className="mt-5">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              text="이전"
              href="#"
              aria-disabled={page === 1}
              className={cn(page === 1 && 'pointer-events-none opacity-50')}
              onClick={(e) => {
                e.preventDefault()
                goToPage(page - 1)
              }}
            />
          </PaginationItem>
          {pageNumbers.map((n) => (
            <PaginationItem key={n}>
              <PaginationLink
                href="#"
                isActive={n === page}
                onClick={(e) => {
                  e.preventDefault()
                  goToPage(n)
                }}
              >
                {n}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              text="다음"
              href="#"
              aria-disabled={page === totalPages}
              className={cn(page === totalPages && 'pointer-events-none opacity-50')}
              onClick={(e) => {
                e.preventDefault()
                goToPage(page + 1)
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      <p className="mt-5 text-caption text-muted-foreground">
        표시된 시세·재무지표는 데모용 예시 데이터입니다. 투자 판단의 근거로 사용할 수 없습니다.
      </p>
    </div>
  )
}
