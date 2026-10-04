import { Link } from 'react-router-dom'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { ChangeText } from '@/components/fg/PriceChange'
import type { ThemeRes, ThemeStockRes } from '@/lib/apiTypes'
import { formatPriceWon } from '@/lib/fg/format'
import { stockPath } from '@/lib/fg/paths'
import { todayLeaders } from '@/lib/fg/themeDetail'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

interface ThemeTodayLeadersProps {
  theme: ThemeRes
  stocks: readonly ThemeStockRes[] | null
  from: string
  className?: string
}

export function ThemeTodayLeaders({ theme, stocks, from, className }: ThemeTodayLeadersProps) {
  const rows = todayLeaders(theme.leaders, stocks)
  return (
    <section className={cn('fg-section', className)} aria-labelledby="fg-tdp-lead">
      <div className="fg-tdp__titles fg-tdp__titles--tight">
        <h2 id="fg-tdp-lead" className="fg-section__title">
          오늘 주도주
        </h2>
        <span className="fg-tdp__cap">테마가 움직인 방향으로 오늘 가장 크게 움직인 종목이에요 · 추천이 아니에요</span>
      </div>
      {rows.length === 0 ? (
        <p className="fg-tdet__none">오늘 크게 움직인 종목이 없어요</p>
      ) : (
        <ul className="fg-mlist">
          {rows.map((row) => (
            <li key={row.ticker}>
              <Link to={stockPath(row.ticker)} state={fromState(from)}>
                <CompanyLogo name={row.name} />
                <span className="fg-mlist__body">
                  <span className="fg-mlist__name">{row.name}</span>
                  {row.price !== null && <span className="fg-mlist__price fg-num">{formatPriceWon(row.price)}</span>}
                </span>
                <ChangeText value={row.change} className="fg-mlist__chg" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
