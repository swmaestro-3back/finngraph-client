import { cn } from '@/lib/utils'

// 정렬 가능한 테이블 컬럼 헤더 행 — 테마 목록 / 주식 목록 / 테마 상세 관련 종목이 공유
// key가 null인 컬럼은 정렬 대상이 아니라 라벨만 표시한다.
export interface TableColumn<K extends string> {
  key: K | null
  label: string
  align?: 'left' | 'center' | 'right'
  /** 해당 컬럼에만 붙는 추가 클래스 (좌우 패딩 등) */
  className?: string
}

interface SortableHeaderRowProps<K extends string> {
  columns: TableColumn<K>[]
  sortKey: K
  sortDesc: boolean
  onSort: (key: K) => void
  /** 그리드 정의를 포함한 행 전체 스타일 */
  className?: string
  cellClassName?: string
  activeClassName?: string
  inactiveClassName?: string
}

export function SortableHeaderRow<K extends string>({
  columns,
  sortKey,
  sortDesc,
  onSort,
  className,
  cellClassName = 'text-xs',
  activeClassName = 'text-primary',
  inactiveClassName = 'text-muted-foreground',
}: SortableHeaderRowProps<K>) {
  return (
    <div className={className}>
      {columns.map((col) => {
        const base = cn(
          'whitespace-nowrap',
          cellClassName,
          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left',
          col.className,
        )

        if (col.key === null) {
          return (
            <span key={col.label} className={cn(base, inactiveClassName)}>
              {col.label}
            </span>
          )
        }

        const sortKeyOfColumn = col.key
        const isActive = sortKey === sortKeyOfColumn
        return (
          <button
            key={col.label}
            type="button"
            onClick={() => onSort(sortKeyOfColumn)}
            className={cn(
              base,
              'inline-flex cursor-pointer items-center gap-1',
              col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start',
              isActive ? activeClassName : inactiveClassName,
            )}
          >
            <span className={cn(col.align === 'center' && 'relative')}>
              {col.label}
              {col.align === 'center' && (
                <span
                  aria-hidden={!isActive}
                  className={cn('absolute top-0 left-full pl-1', !isActive && 'invisible')}
                >
                  {sortDesc ? '↓' : '↑'}
                </span>
              )}
            </span>
            {/* 비활성 컬럼도 화살표 폭을 항상 차지해서 정렬 전환 시 라벨이 밀리지 않게 한다 */}
            {col.align !== 'center' && (
              <span
                aria-hidden={!isActive}
                className={cn(!isActive && 'invisible', col.align === 'right' && 'order-first')}
              >
                {sortDesc ? '↓' : '↑'}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
