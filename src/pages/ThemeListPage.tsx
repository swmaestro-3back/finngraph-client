import { useMemo, useState } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SortableHeaderRow, type TableColumn } from '@/components/table/SortableHeaderRow'
import { Button } from '@/components/ui/button'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useThemes } from '@/lib/queries/useThemes'
import { fromState } from '@/lib/navigation'
import { changeColorClass, formatChangeOrDash, formatCompactKrw } from '@/lib/format'
import { useTableSort } from '@/lib/useTableSort'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

const GRID =
  'grid grid-cols-[36px_minmax(0,1fr)_72px_72px_76px_76px_96px_68px_minmax(0,1.1fr)] items-center gap-2'

type SortKey = 'name' | 'change' | 'w1' | 'm1' | 'm3' | 'tradingValue' | 'stockCount'

interface ThemeRow {
  name: string
  change: number | null
  w1: number | null
  m1: number | null
  m3: number | null
  tradingValue: number | null
  tradingValueLabel: string
  stockCount: number
  topStocks: string
}

const COLUMNS: TableColumn<SortKey>[] = [
  { key: null, label: '#', align: 'left' },
  { key: 'name', label: '테마명', align: 'left' },
  { key: 'change', label: '전일', align: 'right' },
  { key: 'w1', label: '1주', align: 'right' },
  { key: 'm1', label: '1개월', align: 'right' },
  { key: 'm3', label: '3개월', align: 'right' },
  { key: 'tradingValue', label: '거래대금', align: 'right' },
  { key: 'stockCount', label: '종목수', align: 'right' },
  { key: null, label: '대표 종목', align: 'left' },
]

export default function ThemeListPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [page, setPage] = useState(1)
  const { data: themes, loading, error, refetch } = useThemes()

  const allRows: ThemeRow[] = useMemo(
    () =>
      (themes ?? []).map((theme) => ({
        name: theme.name,
        change: theme.change,
        w1: theme.w1,
        m1: theme.m1,
        m3: theme.m3,
        tradingValue: theme.tradingValue,
        tradingValueLabel: formatCompactKrw(theme.tradingValue),
        stockCount: theme.stockCount,
        topStocks: theme.topStocks.map((s) => s.name).join(' · '),
      })),
    [themes],
  )

  const { sorted, sortKey, sortDesc, handleSort } = useTableSort<ThemeRow, SortKey>(
    allRows,
    'm1',
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

  return (
    <div className="page-container pb-12 pt-7">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-[9px]">
          <h1 className="text-display font-medium leading-[1.1] tracking-[-0.8px] text-foreground">
            테마 목록
          </h1>
          <span className="text-body text-muted-foreground">
            전체 {allRows.length}개 테마
          </span>
        </div>
      </div>

      {loading && (
        <div className="card-surface overflow-hidden p-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="mb-2 h-8 animate-pulse rounded bg-muted" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <CircleAlert className="size-8 text-muted-foreground" />
          <p className="text-body text-muted-foreground">
            {error.isRetryable
              ? '일시적으로 데이터를 불러올 수 없습니다.'
              : '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'}
          </p>
          {error.isRetryable && (
            <Button variant="outline" size="sm" onClick={refetch}>
              <RotateCw data-icon="inline-start" />
              다시 시도
            </Button>
          )}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="card-surface overflow-hidden">
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="min-w-[880px]">
                <SortableHeaderRow
                  columns={COLUMNS}
                  sortKey={sortKey}
                  sortDesc={sortDesc}
                  onSort={sortBy}
                  className={cn(GRID, 'border-b border-border bg-muted px-4 py-2.5')}
                />

                {pageRows.map((row, index) => (
                  <button
                    key={row.name}
                    type="button"
                    onClick={() =>
                      navigate(`/theme/${encodeURIComponent(row.name)}`, {
                        state: fromState(pathname),
                      })
                    }
                    className={cn(
                      GRID,
                      'w-full cursor-pointer border-b border-surface-inset px-4 py-[9px] text-left hover:bg-muted',
                      index % 2 === 1 && 'bg-foreground/[0.016]',
                    )}
                  >
                    <span className="font-mono text-caption leading-[1.4] text-foreground-tertiary">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </span>
                    <span className="overflow-hidden text-sm font-medium whitespace-nowrap text-ellipsis text-foreground">
                      {row.name}
                    </span>
                    {(['change', 'w1', 'm1', 'm3'] as const).map((key) => (
                      <span
                        key={key}
                        className={cn(
                          'text-right font-mono text-xs font-medium leading-[1.4]',
                          changeColorClass(row[key] ?? 0),
                        )}
                      >
                        {formatChangeOrDash(row[key])}
                      </span>
                    ))}
                    <span className="text-right font-mono text-xs leading-[1.4] text-foreground">
                      {row.tradingValueLabel}
                    </span>
                    <span className="text-right font-mono text-xs leading-[1.4] text-muted-foreground">
                      {row.stockCount}종목
                    </span>
                    <span className="overflow-hidden text-caption whitespace-nowrap text-ellipsis text-muted-foreground">
                      {row.topStocks}
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
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
        </>
      )}

      <p className="mt-5 text-caption text-muted-foreground">
        표시된 시세·등락률·거래대금은 데모용 시드 데이터입니다. 투자 판단의 근거로 사용할 수
        없습니다.
      </p>
    </div>
  )
}
