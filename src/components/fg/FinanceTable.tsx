import { useLayoutEffect, useRef } from 'react'
import { GapValue } from '@/components/fg/Gap'
import type { FinanceTable as FinanceTableModel } from '@/lib/fg/financials'
import { cn } from '@/lib/utils'

export const TABLE_TITLE_ID = 'fg-sf-table'

interface FinanceTableProps {
  table: FinanceTableModel
  mock: boolean
}

function RowLabel({ label }: { label: string }) {
  const match = /^(.+?)(\(.+\))$/.exec(label)
  if (!match) return label
  return (
    <>
      {match[1]}
      <span className="fg-ftable__alias">{match[2]}</span>
    </>
  )
}

export function FinanceTable({ table, mock }: FinanceTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { years, groups } = table
  const last = years.length - 1

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [years.length])

  return (
    <>
      <div className="fg-ftable-wrap" role="region" aria-labelledby={TABLE_TITLE_ID} tabIndex={0} ref={scrollRef}>
        <table className="fg-ftable fg-ftable--fin fg-num">
          <thead>
            <tr>
              <th scope="col">항목</th>
              {years.map((year, i) => (
                <th key={year} scope="col" className={cn(i === last && 'fg-ftable__now')}>
                  {year}
                </th>
              ))}
              <th scope="col">1년 전보다</th>
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group.title}>
              <tr className="fg-ftable__grp">
                <th colSpan={years.length + 2} scope="rowgroup">
                  <span>{group.title}</span>
                </th>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.key}>
                  <th scope="row">
                    <RowLabel label={row.label} />
                    <small>{row.unit}</small>
                    {row.gap && !mock && <small className="fg-ftable__gap">준비 중</small>}
                  </th>
                  {row.cells.map((cell, i) => (
                    <td key={years[i]} className={cn(i === last && 'fg-ftable__now')}>
                      {row.gap ? <GapValue gap="financials-quarter" mock={cell} /> : cell}
                    </td>
                  ))}
                  <td className="fg-ftable__yoy">
                    {row.gap ? <GapValue gap="financials-quarter" mock={row.yoy} /> : (row.yoy ?? '—')}
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      {years.length > 1 && (
        <p className="fg-sf__foot">{`1년 전보다는 ${years[last]}년을 ${years[last] - 1}년과 비교했어요 · 비율은 %p(퍼센트포인트) 차이예요`}</p>
      )}
    </>
  )
}
