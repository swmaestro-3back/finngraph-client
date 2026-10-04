import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  sort?: 'ascending' | 'descending' | 'none'
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
                  <button type="button" className="fg-table__sort" onClick={column.onSort}>
                    {column.header}
                  </button>
                ) : (
                  column.header
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
