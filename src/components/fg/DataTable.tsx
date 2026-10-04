import type { ReactNode } from 'react'
import { sortGlyph } from '@/lib/fg/format'
import { cn } from '@/lib/utils'

type SortDirection = 'ascending' | 'descending' | 'none'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  sort?: SortDirection
  onSort?: () => void
  note?: string
}

interface DataTableProps<T> {
  label: string
  columns: readonly Column<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
  variant?: 'default' | 'financials'
  className?: string
}

interface SortButtonProps {
  sort?: SortDirection
  onSort: () => void
  children: ReactNode
}

export function SortButton({ sort, onSort, children }: SortButtonProps) {
  return (
    <button type="button" className="fg-table__sort" onClick={onSort}>
      {children}
      <SortMark sort={sort} />
    </button>
  )
}

function SortMark({ sort }: { sort?: SortDirection }) {
  const glyph = sortGlyph(sort)
  return glyph ? (
    <span className="fg-table__glyph" aria-hidden="true">
      {glyph}
    </span>
  ) : null
}

export function DataTable<T>({ label, columns, rows, rowKey, variant = 'default', className }: DataTableProps<T>) {
  return (
    <div className={cn('fg-table-wrap', className)} role="region" aria-label={label} tabIndex={0}>
      <table className={cn('fg-table', variant === 'financials' && 'fg-table--fin')}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={column.sort}
                className={column.align === 'left' ? 'fg-table__left' : undefined}
              >
                {column.onSort ? (
                  <SortButton sort={column.sort} onSort={column.onSort}>
                    {column.header}
                  </SortButton>
                ) : (
                  <>
                    {column.header}
                    <SortMark sort={column.sort} />
                  </>
                )}
                {column.note && <span className="fg-table__note">{column.note}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={column.align === 'left' ? 'fg-table__left' : undefined}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
