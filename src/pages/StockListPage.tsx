import { useMemo } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { DataNotice } from '@/components/layout/DataNotice'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { ListPagination } from '@/components/table/ListPagination'
import { SortableHeaderRow, type TableColumn } from '@/components/table/SortableHeaderRow'
import { StockFilterBar } from '@/components/table/StockFilterBar'
import { StockIdentity } from '@/components/table/StockIdentity'
import { Button } from '@/components/ui/button'
import { FilterChip } from '@/components/ui/filter-chip'
import type { StockRowRes } from '@/lib/apiTypes'
import {
  changeColorClass,
  formatAmountOrDash,
  formatChangeOrDash,
  formatPriceOrDash,
  toEok,
} from '@/lib/format'
import { useAuth } from '@/lib/auth'
import { useFavorites } from '@/lib/favorites'
import { fromState } from '@/lib/navigation'
import { useStocksCached } from '@/lib/queries/useStocksCached'
import { writePage } from '@/lib/listParams'
import {
  applyStockFilters,
  filterFromParams,
  filterToParams,
  isFilterActive,
  type FilterState,
} from '@/lib/stockFilter'
import { usePageParam, useUrlTableSort } from '@/lib/useListParams'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

const NUM = 'text-center font-mono text-sm leading-none tabular-nums'

const GRID =
  'grid grid-cols-[36px_28px_minmax(190px,1fr)_92px_76px_76px_76px_76px_96px_64px_64px_64px_64px] items-center gap-2'

const SORT_KEYS = [
  'name',
  'change',
  'w1',
  'm1',
  'm3',
  'marketCap',
  'per',
  'pbr',
  'roe',
  'dividendYield',
] as const
type SortKey = (typeof SORT_KEYS)[number]

const COLUMNS: TableColumn<SortKey>[] = [
  { key: null, label: '#', align: 'left' },
  { key: null, label: '', align: 'left' },
  { key: 'name', label: '종목명', align: 'left' },
  { key: null, label: '현재가', align: 'center' },
  { key: 'change', label: '등락률', align: 'center' },
  { key: 'w1', label: '1주', align: 'center' },
  { key: 'm1', label: '1개월', align: 'center' },
  { key: 'm3', label: '3개월', align: 'center' },
  { key: 'marketCap', label: '시가총액 (억)', align: 'center' },
  { key: 'per', label: 'PER', align: 'center' },
  { key: 'pbr', label: 'PBR', align: 'center' },
  { key: 'roe', label: 'ROE', align: 'center' },
  { key: 'dividendYield', label: '배당률', align: 'center' },
]

export default function StockListPage() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  // 페이지·정렬·필터는 주소 쿼리에 둔다 — 상세에 다녀와도 보던 목록으로 돌아온다
  const [params, setParams] = useSearchParams()
  const filter = useMemo(() => filterFromParams(params), [params])
  const { status } = useAuth()
  // 로그아웃 상태로 ?fav=1 주소에 들어오면 빈 목록 대신 전체를 보인다
  const onlyFavorites = params.get('fav') === '1' && status !== 'anonymous'
  const { has } = useFavorites()
  const { data: stocks, loading, error, refetch } = useStocksCached()

  const allRows: StockRowRes[] = useMemo(() => stocks ?? [], [stocks])
  const filteredRows = useMemo(() => applyStockFilters(allRows, filter), [allRows, filter])
  const filterActive = isFilterActive(filter)
  // 관심 필터는 FilterState 밖에 둔다 — stockFilter.ts는 순수 모듈이라 로그인 상태를 모른다
  const visibleRows = useMemo(
    () => (onlyFavorites ? filteredRows.filter((row) => has('STOCK', row.ticker)) : filteredRows),
    [filteredRows, has, onlyFavorites],
  )

  // 필터가 바뀌면 보던 페이지 번호는 의미가 없으니 같은 갱신에서 1페이지로 돌린다.
  // 범위 입력은 글자마다 불리므로 히스토리에 쌓지 않는다
  const updateParams = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params)
    mutate(next)
    writePage(next, 1)
    setParams(next, { replace: true })
  }

  const handleFilterChange = (next: FilterState) => {
    updateParams((p) => filterToParams(next, p))
  }

  const toggleFavorites = () => {
    updateParams((p) => {
      if (onlyFavorites) p.delete('fav')
      else p.set('fav', '1')
    })
  }

  const { sorted, sortKey, sortDesc, handleSort } = useUrlTableSort<StockRowRes, SortKey>(
    visibleRows,
    SORT_KEYS,
    'w1',
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const { page, goToPage } = usePageParam(totalPages)
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="page-container pb-12 pt-7">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div className="flex items-baseline gap-[9px]">
          <h1 className="text-display font-medium leading-[1.1] tracking-[-0.8px] text-foreground">
            주식 목록
          </h1>
          <span className="text-body text-muted-foreground">
            {filterActive
              ? `조건 일치 ${filteredRows.length} / 전체 ${allRows.length}`
              : `전체 ${allRows.length}개 종목`}
          </span>
        </div>
      </div>

      {loading && (
        <div className="card-surface overflow-hidden p-4">
          {Array.from({ length: 10 }, (_, i) => (
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
          <div className="mb-2 flex items-center gap-2">
            <FilterChip
              active={onlyFavorites}
              onClick={() => {
                if (status !== 'authenticated') {
                  navigate('/login', { state: { next: pathname } })
                  return
                }
                toggleFavorites()
              }}
            >
              내 관심만
            </FilterChip>
            {onlyFavorites && (
              <span className="text-caption text-muted-foreground">
                관심 종목 {visibleRows.length}개
              </span>
            )}
          </div>

          <StockFilterBar
            value={filter}
            onChange={handleFilterChange}
            matchCount={filteredRows.length}
          />

          <div className="card-surface overflow-hidden">
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="min-w-[1140px]">
                <SortableHeaderRow
                  columns={COLUMNS}
                  sortKey={sortKey}
                  sortDesc={sortDesc}
                  onSort={handleSort}
                  className={cn(GRID, 'border-b border-border bg-muted px-4 py-2.5')}
                />

                {pageRows.map((row, index) => (
                  // 별표가 행 안에 들어가 button 중첩이 되므로 행을 div+role로 바꿨다
                  <div
                    key={row.ticker}
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      navigate(`/stock/${row.ticker}`, { state: fromState(pathname + search) })
                    }
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter' && event.key !== ' ') return
                      event.preventDefault()
                      navigate(`/stock/${row.ticker}`, { state: fromState(pathname + search) })
                    }}
                    className={cn(
                      GRID,
                      'w-full cursor-pointer border-b border-surface-inset px-4 py-2.5 text-left hover:bg-muted',
                      index % 2 === 1 && 'bg-foreground/[0.016]',
                    )}
                  >
                    <span className="font-mono text-caption leading-[1.4] text-foreground-tertiary">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </span>
                    <FavoriteStar
                      type="STOCK"
                      targetKey={row.ticker}
                      label={row.name}
                      size="sm"
                      className="-ml-1"
                    />
                    <StockIdentity
                      name={row.name}
                      code={row.ticker}
                      market={row.market === 'KOSDAQ' ? 'KOSDAQ' : 'KOSPI'}
                    />
                    <span className={cn(NUM, 'font-medium text-foreground')}>
                      {formatPriceOrDash(row.price)}
                    </span>
                    {(['change', 'w1', 'm1', 'm3'] as const).map((key) => (
                      <span
                        key={key}
                        className={cn(
                          NUM,
                          'font-medium',
                          changeColorClass(row[key] ?? 0),
                        )}
                      >
                        {formatChangeOrDash(row[key])}
                      </span>
                    ))}
                    <span className={cn(NUM, 'text-foreground')}>
                      {formatAmountOrDash(toEok(row.marketCap))}
                    </span>
                    <span className={cn(NUM, 'text-foreground-secondary')}>
                      {row.per === null ? '—' : row.per.toFixed(2)}
                    </span>
                    <span className={cn(NUM, 'text-foreground-secondary')}>
                      {row.pbr === null ? '—' : row.pbr.toFixed(2)}
                    </span>
                    <span className={cn(NUM, 'text-foreground-secondary')}>
                      {row.roe === null ? '—' : `${row.roe.toFixed(1)}%`}
                    </span>
                    <span className={cn(NUM, 'text-foreground-secondary')}>
                      {row.dividendYield === null ? '—' : `${row.dividendYield.toFixed(2)}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ListPagination page={page} totalPages={totalPages} onPageChange={goToPage} className="mt-5" />
        </>
      )}

      <DataNotice className="mt-5" />
    </div>
  )
}
