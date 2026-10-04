import type { Ref } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { GapValue } from '@/components/fg/Gap'
import type { GapId } from '@/lib/dataGaps'
import { navState, STOCK_TABS, stockTabSearch, type StockTab } from '@/lib/fg/stockDetail'
import { cn } from '@/lib/utils'

export interface TabCount {
  gap: GapId
  value: number
}

export type TabCounts = Partial<Record<StockTab, TabCount>>

interface StockTabsProps {
  label: string
  current: StockTab
  counts: TabCounts
  className?: string
  ref?: Ref<HTMLElement>
}

export function StockTabs({ label, current, counts, className, ref }: StockTabsProps) {
  const { pathname, search, state } = useLocation()
  return (
    <nav ref={ref} className={cn('fg-sdtabs', className)} aria-label={label}>
      <ul className="fg-ptabs">
        {STOCK_TABS.map((tab) => {
          const count = counts[tab.value]
          return (
            <li key={tab.value}>
              <Link
                to={{ pathname, search: stockTabSearch(search, tab.value) }}
                state={navState(state)}
                replace
                className="fg-ptab"
                aria-current={tab.value === current ? 'page' : undefined}
              >
                {tab.label}
                {count && <GapValue gap={count.gap} mock={count.value} className="fg-ptab__count fg-num" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
