import { Star } from 'lucide-react'
import { useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { Button, ButtonLink } from '@/components/fg/Button'
import type { StockRowRes } from '@/lib/apiTypes'
import { MOTION_BASE_MS, MOTION_EASE, STAR_POP, motionAllowed } from '@/lib/fg/motion'
import { stockPath, themePath } from '@/lib/fg/paths'
import { useFavoriteToggle } from '@/lib/fg/useFavoriteToggle'
import { fromState } from '@/lib/navigation'

type StockRef = Pick<StockRowRes, 'ticker' | 'name'>

export function StockStar({ stock, className }: { stock: StockRef; className?: string }) {
  return <FavoriteStar type="STOCK" targetKey={stock.ticker} label={stock.name} className={className} />
}

export function StockWatchButton({ stock, className }: { stock: StockRef; className?: string }) {
  const { active, press } = useFavoriteToggle('STOCK', stock.ticker)
  const icon = useRef<SVGSVGElement>(null)
  const onClick = () => {
    if (press() && motionAllowed()) icon.current?.animate(STAR_POP, { duration: MOTION_BASE_MS, easing: MOTION_EASE })
  }
  return (
    <Button aria-pressed={active} onClick={onClick} className={className}>
      <Star ref={icon} size={18} strokeWidth={1.75} fill={active ? 'currentColor' : 'none'} aria-hidden="true" />
      {active ? '관심 종목' : '관심 추가'}
    </Button>
  )
}

export function StockGraphLink({ stock, className }: { stock: StockRef; className?: string }) {
  const { pathname, search } = useLocation()
  return (
    <ButtonLink to={`/graph/${encodeURIComponent(stock.ticker)}`} state={fromState(`${pathname}${search}`)} className={className}>
      관계 탐색에서 보기
    </ButtonLink>
  )
}

export function StockDetailLink({ stock, className }: { stock: StockRef; className?: string }) {
  const { pathname, search } = useLocation()
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
