// Lucian UX/UI Prompt #022 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#022
import { ChevronRight } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { BurstStar } from '@/components/fg/BurstStar'
import { Button, ButtonLink } from '@/components/fg/Button'
import type { StockRowRes } from '@/lib/apiTypes'
import { stockPath, themePath } from '@/lib/fg/paths'
import { useBurst } from '@/lib/fg/useBurst'
import { useFavoriteToggle } from '@/lib/fg/useFavoriteToggle'
import { fromState } from '@/lib/navigation'

type StockRef = Pick<StockRowRes, 'ticker' | 'name'>

export function StockStar({ stock, className }: { stock: StockRef; className?: string }) {
  return <FavoriteStar type="STOCK" targetKey={stock.ticker} label={stock.name} className={className} />
}

export function StockWatchButton({ stock, className }: { stock: StockRef; className?: string }) {
  const { active, press } = useFavoriteToggle('STOCK', stock.ticker)
  const [pop, fire] = useBurst()
  const onClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (press({ label: stock.name, anchor: event.currentTarget })) fire()
  }
  return (
    <Button aria-pressed={active} onClick={onClick} className={className}>
      <BurstStar on={active} pop={pop} size={18} />
      {active ? '관심 종목' : '관심 추가'}
    </Button>
  )
}

interface StockGraphLinkProps {
  stock: StockRef
  text?: boolean
  className?: string
}

export function StockGraphLink({ stock, text = false, className }: StockGraphLinkProps) {
  const { pathname, search } = useLocation()
  const to = `/graph/${encodeURIComponent(stock.ticker)}`
  const state = fromState(`${pathname}${search}`)
  if (text) {
    return (
      <Link to={to} state={state} className={className ? `fg-sdmore ${className}` : 'fg-sdmore'}>
        관계 탐색에서 보기
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    )
  }
  return (
    <ButtonLink to={to} state={state} className={className}>
      관계 탐색에서 보기
    </ButtonLink>
  )
}

interface StockDetailLinkProps {
  stock: StockRef
  text?: boolean
  className?: string
}

export function StockDetailLink({ stock, text = false, className }: StockDetailLinkProps) {
  const { pathname, search } = useLocation()
  if (text) {
    return (
      <Link
        to={stockPath(stock.ticker)}
        state={fromState(`${pathname}${search}`)}
        className={className ? `fg-sdmore ${className}` : 'fg-sdmore'}
      >
        종목 상세 보기
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </Link>
    )
  }
  return (
    <ButtonLink
      to={stockPath(stock.ticker)}
      state={fromState(`${pathname}${search}`)}
      variant="primary"
      className={className}
    >
      종목 상세 보기
    </ButtonLink>
  )
}

interface StockThemeChipsProps {
  stock: Pick<StockRowRes, 'themeId' | 'themeName'>
  className?: string
}

export function StockThemeChips({ stock, className = 'fg-tdet__sec' }: StockThemeChipsProps) {
  const { pathname, search } = useLocation()
  if (stock.themeId === null || !stock.themeName) return null
  return (
    <div className={className}>
      <span className="fg-tdet__label">대표 테마</span>
      <div className="fg-sdet__chips">
        <Link to={themePath(stock.themeId)} state={fromState(`${pathname}${search}`)} className="fg-chip">
          {stock.themeName}
        </Link>
      </div>
    </div>
  )
}
