import { useRef, type Ref } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { GapValue } from '@/components/fg/Gap'
import type { GapId } from '@/lib/dataGaps'
import { navState, STOCK_TABS, stockTabSearch, type StockTab } from '@/lib/fg/stockDetail'
import { useSlidingMark } from '@/lib/fg/useSlidingMark'
import { cn } from '@/lib/utils'

export interface TabCount {
  gap?: GapId
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
  const list = useRef<HTMLUListElement>(null)
  const mark = useRef<HTMLLIElement>(null)
  useSlidingMark(list, mark, STOCK_TABS.findIndex((tab) => tab.value === current), { items: '.fg-ptab', motion: 'stretch' })
  return (
    <nav ref={ref} className={cn('fg-sdtabs', className)} aria-label={label}>
      <ul ref={list} className="fg-ptabs">
        <li ref={mark} className="fg-ptabs__mark" aria-hidden="true" />
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
                {count?.gap && <GapValue gap={count.gap} mock={count.value} className="fg-ptab__count fg-num" />}
                {count && !count.gap && <span className="fg-ptab__count fg-num">{count.value}</span>}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
