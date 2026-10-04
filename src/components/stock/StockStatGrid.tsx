import { RailCard } from '@/components/stock/StockOverviewLayout'
import type { StockDetailRes } from '@/lib/apiTypes'
import { formatAmountOrDash, formatChange, toEok } from '@/lib/format'
import { formatShortDate } from '@/lib/themeMetrics'

interface StatItem {
  label: string
  value: string
}

function statItems(stock: StockDetailRes): StatItem[] {
  return [
    { label: '시가총액', value: `${formatAmountOrDash(toEok(stock.marketCap))}억` },
    { label: 'PER', value: stock.per === null ? '—' : `${stock.per.toFixed(2)}배` },
    { label: 'PBR', value: stock.pbr === null ? '—' : stock.pbr.toFixed(2) },
    { label: 'ROE', value: stock.roe === null ? '—' : `${stock.roe.toFixed(2)}%` },
    { label: 'EPS', value: stock.eps === null ? '—' : `${Math.round(stock.eps).toLocaleString('ko-KR')}원` },
    { label: '배당수익률', value: stock.dividendYield === null ? '—' : `${stock.dividendYield.toFixed(2)}%` },
    { label: '외국인 보유율', value: stock.foreignRatio === null ? '—' : `${stock.foreignRatio.toFixed(1)}%` },
    { label: '전년 대비 매출', value: stock.revenueGrowth === null ? '—' : formatChange(stock.revenueGrowth) },
  ]
}

export function StockStatGrid({ stock }: { stock: StockDetailRes }) {
  const basisDate = stock.valuationDate ?? stock.baseDate ?? null

  return (
    <RailCard
      title="핵심 지표"
      aside={basisDate ? <span className="font-mono">{formatShortDate(basisDate)} 기준</span> : undefined}
    >
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4 lg:grid-cols-2">
        {statItems(stock).map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="truncate text-caption text-muted-foreground">{item.label}</dt>
            <dd className="truncate font-mono text-sm font-medium tabular-nums text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </RailCard>
  )
}
