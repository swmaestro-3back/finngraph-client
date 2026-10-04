import type { ReactNode } from 'react'
import { SectionTabs, useTabParam, type SectionTab } from '@/components/layout/SectionTabs'
import type { StockDetailRes } from '@/lib/apiTypes'
import { changeColorClass, formatChangeOrDash, formatPriceOrDash } from '@/lib/format'
import { cn } from '@/lib/utils'

export type StockTab = 'reason' | 'supply' | 'financials' | 'disclosures' | 'company'

export const STOCK_TABS: SectionTab<StockTab>[] = [
  { key: 'reason', label: '이유' },
  { key: 'supply', label: '수급' },
  { key: 'financials', label: '실적·재무' },
  { key: 'disclosures', label: '공시' },
  { key: 'company', label: '기업 개요' },
]

export function useStockTab(): [StockTab, (next: StockTab) => void] {
  return useTabParam(STOCK_TABS, 'reason')
}

interface StockSectionTabsProps {
  stock: StockDetailRes
  value: StockTab
  onChange: (next: StockTab) => void
  counts?: Partial<Record<StockTab, number>>
  children: ReactNode
}

export function StockSectionTabs({ stock, value, onChange, counts, children }: StockSectionTabsProps) {
  return (
    <SectionTabs
      tabs={STOCK_TABS}
      value={value}
      onChange={onChange}
      idPrefix="stock"
      label="종목 상세 섹션"
      counts={counts}
      mini={
        <>
          <span className="truncate text-sm font-semibold text-foreground">{stock.name}</span>
          <span className="font-mono text-sm font-medium tabular-nums text-foreground">{formatPriceOrDash(stock.price)}</span>
          <span className={cn('font-mono text-caption font-medium', changeColorClass(stock.change ?? 0))}>
            {formatChangeOrDash(stock.change)}
          </span>
        </>
      }
    >
      {children}
    </SectionTabs>
  )
}
