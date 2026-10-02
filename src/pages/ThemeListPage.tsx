import { useMemo } from 'react'
import { CircleAlert, RotateCw } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DataNotice } from '@/components/layout/DataNotice'
import { ListPagination } from '@/components/table/ListPagination'
import { SortableHeaderRow, type TableColumn } from '@/components/table/SortableHeaderRow'
import { Breadth } from '@/components/theme/ThemeMetricSummary'
import { Button } from '@/components/ui/button'
import { useThemeMarket } from '@/lib/queries/useThemeMarket'
import { useThemes } from '@/lib/queries/useThemes'
import { fromState } from '@/lib/navigation'
import { changeColorClass, formatChange, formatChangeOrDash, formatCompactKrw } from '@/lib/format'
import {
  formatShortDate,
  hotExclusionTitle,
  leaderCellContent,
  leaderColumnLabel,
  type LeaderCellContent,
} from '@/lib/themeMetrics'
import { usePageParam, useUrlTableSort } from '@/lib/useListParams'
import { cn } from '@/lib/utils'
import { priceBasisSuffix } from '@/lib/referenceDate'

const PAGE_SIZE = 20

const NUM = 'text-center font-mono text-sm leading-none tabular-nums'

const GRID =
  'grid grid-cols-[36px_minmax(170px,1fr)_76px_96px_76px_76px_76px_96px_84px_minmax(220px,1.5fr)] items-center gap-2'

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
  leaderCell: LeaderCellContent
  exclusionTitle: string | null
}

const BASE_COLUMNS: TableColumn<SortKey>[] = [
  { key: null, label: '#', align: 'left' },
  { key: 'name', label: '테마명', align: 'left' },
  { key: 'change', label: '등락률', align: 'center' },
  { key: 'breadth', label: '등락 현황', align: 'center' },
  { key: 'w1', label: '1주', align: 'center' },
  { key: 'm1', label: '1개월', align: 'center' },
  { key: 'm3', label: '3개월', align: 'center' },
  { key: 'tradingValue', label: '거래대금', align: 'center' },
  { key: 'stockCount', label: '종목수', align: 'center' },
]

function LeaderCell({ content }: { content: LeaderCellContent }) {
  if (content.kind === 'empty') {
    return (
      <span className="pl-4 text-caption text-foreground-tertiary" aria-label="주도주 없음">
        —
      </span>
    )
  }
  if (content.kind === 'legacy') {
    return (
      <span className="overflow-hidden pl-4 text-caption whitespace-nowrap text-ellipsis text-muted-foreground">
        {content.text}
      </span>
    )
  }
  return (
    <span className="flex items-center gap-3 overflow-hidden pl-4 text-caption whitespace-nowrap text-foreground-secondary">
      {content.leaders.map((leader) => (
        <span key={leader.ticker} className="inline-flex items-baseline gap-1 truncate">
          <span className="truncate">{leader.name}</span>
          {leader.change !== null && (
            <span className={cn('font-mono tabular-nums', changeColorClass(leader.change))}>
              {formatChange(leader.change)}
            </span>
          )}
        </span>
      ))}
    </span>
  )
}

export default function ThemeListPage() {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const { data: themes, loading, error, refetch } = useThemes()
  const { data: market } = useThemeMarket()
  const baseDate = market?.baseDate ?? themes?.[0]?.baseDate ?? null
  const columns = useMemo<TableColumn<SortKey>[]>(
    () => [
      ...BASE_COLUMNS,
      { key: null, label: leaderColumnLabel(themes ?? []), align: 'left', className: 'pl-4' },
    ],
    [themes],
  )

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
          leaderCell: leaderCellContent(theme.leaders, theme.topStocks),
          exclusionTitle: hotExclusionTitle(theme),
        }
      }),
    [themes],
  )

  // 페이지·정렬은 주소 쿼리에 둔다 — 상세에 다녀와도 보던 목록으로 돌아온다
  const { sorted, sortKey, sortDesc, handleSort } = useUrlTableSort<ThemeRow, SortKey>(
    allRows,
    SORT_KEYS,
    'm3',
  )

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const { page, goToPage } = usePageParam(totalPages)
  const pageRows = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
          <p className="mb-2 flex flex-wrap items-center gap-y-1 text-caption text-muted-foreground break-keep">
            {baseDate && (
              <>
                <span>
                  <span className="font-mono tabular-nums text-foreground-secondary">
                    {formatShortDate(baseDate)}
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
              <div className="min-w-[1080px]">
                <SortableHeaderRow
                  columns={columns}
                  sortKey={sortKey}
                  sortDesc={sortDesc}
                  onSort={handleSort}
                  className={cn(GRID, 'border-b border-border bg-muted px-4 py-2.5')}
                />

                {pageRows.map((row, index) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() =>
                      navigate(`/theme/${row.id}`, {
                        state: fromState(pathname + search),
                      })
                    }
                    className={cn(
                      GRID,
                      'w-full cursor-pointer border-b border-surface-inset px-4 py-2.5 text-left hover:bg-muted',
                      index % 2 === 1 && 'bg-foreground/[0.016]',
                    )}
                  >
                    <span className="font-mono text-caption leading-[1.4] text-foreground-tertiary">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </span>
                    <span className="overflow-hidden text-sm font-medium whitespace-nowrap text-ellipsis text-foreground">
                      {row.name}
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
                    <LeaderCell content={row.leaderCell} />
                  </button>
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
