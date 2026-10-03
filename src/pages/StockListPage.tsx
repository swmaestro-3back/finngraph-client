import { useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { DataNotice } from '@/components/layout/DataNotice'
import { ErrorState } from '@/components/layout/ErrorState'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { ListPagination } from '@/components/table/ListPagination'
import { SortableHeaderRow, type TableColumn } from '@/components/table/SortableHeaderRow'
import { StockFilterBar } from '@/components/table/StockFilterBar'
import { LinkRow, NUM } from '@/components/table/LinkRow'
import { StockIdentity } from '@/components/table/StockIdentity'
import { TableSkeleton } from '@/components/table/TableSkeleton'
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
import { useStocksCached } from '@/lib/queries/useStocksCached'
import { writePage } from '@/lib/listParams'
import {
  applyStockFilters,
  filterFromParams,
  filterToParams,
  isFilterActive,
  type FilterState,
} from '@/lib/stockFilter'
import { usePagedRows, useUrlTableSort } from '@/lib/useListParams'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 20

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
  const { pathname } = useLocation()
  // 페이지·정렬·필터는 주소 쿼리에 둔다 — 상세에 다녀와도 보던 목록으로 돌아온다
  const [params, setParams] = useSearchParams()
  // 필터에 관한 쿼리만 뽑아 키로 삼는다 — 페이지·정렬이 바뀌어도 filter 참조가 유지돼 3천 행을 다시 거르지 않는다
  const filterKey = useMemo(() => {
    const only = new URLSearchParams()
    filterToParams(filterFromParams(params), only)
    return only.toString()
  }, [params])
  const filter = useMemo(() => filterFromParams(new URLSearchParams(filterKey)), [filterKey])
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

  const { page, totalPages, goToPage, pageRows } = usePagedRows(sorted, PAGE_SIZE)

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

      {loading && <TableSkeleton rows={10} />}

      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

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
                  <LinkRow key={row.ticker} to={`/stock/${row.ticker}`} index={index} gridClassName={GRID}>
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
                  </LinkRow>
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
