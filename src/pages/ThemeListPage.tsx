import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { DataNotice } from '@/components/layout/DataNotice'
import { ErrorState } from '@/components/layout/ErrorState'
import { LinkRow, NUM } from '@/components/table/LinkRow'
import { ListPagination } from '@/components/table/ListPagination'
import { SortableHeaderRow, type TableColumn } from '@/components/table/SortableHeaderRow'
import { TableSkeleton } from '@/components/table/TableSkeleton'
import { Breadth } from '@/components/theme/ThemeMetricSummary'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useThemeMarket } from '@/lib/queries/useThemeMarket'
import { useThemesCached } from '@/lib/queries/useThemesCached'
import { changeColorClass, formatChangeOrDash, formatCompactKrw } from '@/lib/format'
import { formatMonthDay, hotExclusionTitle } from '@/lib/themeMetrics'
import { readQuery, writePage, writeQuery } from '@/lib/listParams'
import { isBlankQuery, matchRange } from '@/lib/nameMatch'
import { usePagedRows, useUrlTableSort } from '@/lib/useListParams'
import { cn } from '@/lib/utils'
import { priceBasisSuffix } from '@/lib/referenceDate'

const PAGE_SIZE = 20

const GRID =
  'grid grid-cols-[36px_28px_minmax(170px,1fr)_76px_96px_76px_76px_76px_96px_84px_minmax(220px,1.5fr)] items-center gap-2'

const SORT_KEYS = [
  'name',
  'change',
  'breadth',
  'w1',
  'm1',
  'm3',
  'tradingValue',
  'stockCount',
] as const
type SortKey = (typeof SORT_KEYS)[number]

interface ThemeRow {
  id: number
  name: string
  change: number | null
  breadth: number | null
  upCount: number | null
  flatCount: number | null
  downCount: number | null
  w1: number | null
  m1: number | null
  m3: number | null
  tradingValue: number | null
  tradingValueLabel: string
  stockCount: number
  pricedCount: number | null
  /** 시가총액 상위 종목 이름 — 상세 페이지 대장주 카드와 같은 종목 */
  leaders: string[]
  exclusionTitle: string | null
}

const COLUMNS: TableColumn<SortKey>[] = [
  { key: null, label: '#', align: 'left' },
  { key: null, label: '', align: 'left' },
  { key: 'name', label: '테마명', align: 'left' },
  { key: 'change', label: '등락률', align: 'center' },
  { key: 'breadth', label: '등락 현황', align: 'center' },
  { key: 'w1', label: '1주', align: 'center' },
  { key: 'm1', label: '1개월', align: 'center' },
  { key: 'm3', label: '3개월', align: 'center' },
  { key: 'tradingValue', label: '거래대금', align: 'center' },
  { key: 'stockCount', label: '종목수', align: 'center' },
  { key: null, label: '대장주', align: 'left', className: 'pl-4' },
]

const LEADER_COUNT = 3

function LeaderCell({ names }: { names: string[] }) {
  if (names.length === 0) {
    return (
      <span className="pl-4 text-caption text-foreground-tertiary" aria-label="대장주 없음">
        —
      </span>
    )
  }
  return (
    <span
      title={names.join(', ')}
      className="flex items-center gap-3 overflow-hidden pl-4 text-caption whitespace-nowrap text-foreground-secondary"
    >
      {names.map((name) => (
        <span key={name} className="min-w-0 truncate">
          {name}
        </span>
      ))}
    </span>
  )
}

/** 검색어와 일치한 글자만 강조한 테마명 */
function HighlightedName({ name, query }: { name: string; query: string }) {
  const range = matchRange(name, query)
  if (!range) return <>{name}</>
  const [start, end] = range
  return (
    <>
      {name.slice(0, start)}
      <mark className="bg-transparent text-primary">{name.slice(start, end)}</mark>
      {name.slice(end)}
    </>
  )
}

export default function ThemeListPage() {
  const [params, setParams] = useSearchParams()
  // 입력 원문은 로컬에 든다 — 한글 조합 중 글자를 주소 왕복에 맡기면 깨질 수 있다. 초기값만 주소에서 읽는다
  const [query, setQuery] = useState(() => readQuery(params))
  const { data: themes, loading, error, refetch } = useThemesCached()
  const { data: market } = useThemeMarket()
  const baseDate = market?.baseDate ?? themes?.[0]?.baseDate ?? null
  const allRows: ThemeRow[] = useMemo(
    () =>
      (themes ?? []).map((theme) => {
        const hasBreadthCounts = theme.upCount !== undefined && theme.downCount !== undefined
        return {
          id: theme.id,
          name: theme.name,
          change: theme.change,
          breadth: hasBreadthCounts ? (theme.upCount as number) - (theme.downCount as number) : null,
          upCount: theme.upCount ?? null,
          flatCount: theme.flatCount ?? null,
          downCount: theme.downCount ?? null,
          w1: theme.w1,
          m1: theme.m1,
          m3: theme.m3,
          tradingValue: theme.tradingValue,
          tradingValueLabel: formatCompactKrw(theme.tradingValue),
          stockCount: theme.stockCount,
          pricedCount: theme.pricedCount ?? null,
          leaders: theme.topStocks.slice(0, LEADER_COUNT).map((s) => s.name),
          exclusionTitle: hotExclusionTitle(theme),
        }
      }),
    [themes],
  )

  // 페이지·정렬은 주소 쿼리에 둔다 — 상세에 다녀와도 보던 목록으로 돌아온다
  const searching = !isBlankQuery(query)
  const matchedRows = useMemo(
    () => (searching ? allRows.filter((row) => matchRange(row.name, query) !== null) : allRows),
    [allRows, query, searching],
  )

  // 검색어는 ?q=에 두어 상세에 다녀와도 남게 한다. 글자마다 바뀌므로 히스토리에 쌓지 않고, 보던 페이지는 1로 돌린다
  const changeQuery = (next: string) => {
    setQuery(next)
    const nextParams = new URLSearchParams(params)
    writeQuery(nextParams, next)
    writePage(nextParams, 1)
    setParams(nextParams, { replace: true })
  }

  const { sorted, sortKey, sortDesc, handleSort } = useUrlTableSort<ThemeRow, SortKey>(
    matchedRows,
    SORT_KEYS,
    'm3',
  )

  const { page, totalPages, goToPage, pageRows } = usePagedRows(sorted, PAGE_SIZE)

  return (
    <div className="page-container pb-12 pt-7">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="flex items-baseline gap-[9px]">
          <h1 className="text-display font-medium leading-[1.1] tracking-[-0.8px] text-foreground">
            테마 목록
          </h1>
          <span className="text-body text-muted-foreground">
            {searching
              ? `검색 결과 ${matchedRows.length} / 전체 ${allRows.length}`
              : `전체 ${allRows.length}개 테마`}
          </span>
        </div>
        {/* 제목 줄 오른쪽 — 결과 목록을 띄우지 않고 아래 표를 바로 걸러낸다 */}
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            strokeWidth={2}
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') changeQuery('')
            }}
            placeholder="테마 이름으로 찾기"
            aria-label="테마 이름으로 찾기"
            className="h-9 rounded-lg border-0 bg-muted pr-9 pl-10 focus-visible:ring-2 [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="검색어 지우기"
              onClick={() => changeQuery('')}
              className="absolute top-1/2 right-1.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      </div>

      {loading && <TableSkeleton rows={8} />}

      {!loading && error && <ErrorState error={error} onRetry={refetch} />}

      {!loading && !error && (
        <>
          <p className="mb-2 flex flex-wrap items-center gap-y-1 text-caption text-muted-foreground break-keep">
            {baseDate && (
              <>
                <span>
                  <span className="font-mono tabular-nums text-foreground-secondary">
                    {formatMonthDay(baseDate)}
                  </span>{' '}
                  {priceBasisSuffix(market)}
                </span>
                <span className="mx-1.5 text-foreground-tertiary" aria-hidden>
                  ·
                </span>
              </>
            )}
            <span>1주/1개월/3개월은 달력 기준</span>
          </p>
          <div className="card-surface overflow-hidden">
            <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="min-w-[1116px]">
                <SortableHeaderRow
                  columns={COLUMNS}
                  sortKey={sortKey}
                  sortDesc={sortDesc}
                  onSort={handleSort}
                  className={cn(GRID, 'border-b border-border bg-muted px-4 py-2.5')}
                />

                {searching && matchedRows.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <p className="text-body text-muted-foreground">
                      '{query.trim()}'와 일치하는 테마가 없습니다.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => changeQuery('')}>
                      검색어 지우기
                    </Button>
                  </div>
                )}
                {pageRows.map((row, index) => (
                  <LinkRow key={row.id} to={`/theme/${row.id}`} index={index} gridClassName={GRID}>
                    <span className="font-mono text-caption leading-[1.4] text-foreground-tertiary">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </span>
                    <FavoriteStar
                      type="THEME"
                      targetKey={String(row.id)}
                      label={row.name}
                      size="sm"
                      className="-ml-1"
                    />
                    <span className="overflow-hidden text-sm font-medium whitespace-nowrap text-ellipsis text-foreground">
                      <HighlightedName name={row.name} query={query} />
                    </span>
                    <span
                      title={row.exclusionTitle ?? undefined}
                      className={cn(
                        NUM,
                        'font-medium',
                        row.change === null
                          ? 'text-foreground-tertiary'
                          : row.exclusionTitle
                            ? 'text-foreground-tertiary'
                            : changeColorClass(row.change),
                      )}
                    >
                      {formatChangeOrDash(row.change)}
                    </span>
                    <span className={cn(NUM, 'font-medium')}>
                      {row.upCount !== null && row.downCount !== null ? (
                        <Breadth
                          up={row.upCount}
                          flat={row.flatCount ?? 0}
                          down={row.downCount}
                        />
                      ) : (
                        <span className="text-foreground-tertiary">—</span>
                      )}
                    </span>
                    {(['w1', 'm1', 'm3'] as const).map((key) => (
                      <span
                        key={key}
                        className={cn(
                          NUM,
                          'font-medium',
                          row[key] === null ? 'text-foreground-tertiary' : changeColorClass(row[key]),
                        )}
                      >
                        {formatChangeOrDash(row[key])}
                      </span>
                    ))}
                    <span className={cn(NUM, 'text-foreground')}>
                      {row.tradingValueLabel}
                    </span>
                    <span className={cn(NUM, 'text-foreground-secondary')}>
                      {row.pricedCount !== null && row.pricedCount !== row.stockCount ? (
                        <>
                          <span className="text-foreground-tertiary">
                            {row.pricedCount}/{row.stockCount}
                          </span>
                          종목
                        </>
                      ) : (
                        `${row.stockCount}종목`
                      )}
                    </span>
                    <LeaderCell names={row.leaders} />
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
