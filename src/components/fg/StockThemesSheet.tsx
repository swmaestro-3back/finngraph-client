import { ChevronRight } from 'lucide-react'
import type { RefObject } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChangeText } from '@/components/fg/PriceChange'
import { SideSheet } from '@/components/fg/SideSheet'
import type { StockThemeRes } from '@/lib/apiTypes'
import { themePath } from '@/lib/fg/paths'
import { themesByChange } from '@/lib/fg/stockDetail'
import { josa } from '@/lib/josa'
import { fromState } from '@/lib/navigation'

interface StockThemesSheetProps {
  stockName: string
  themes: readonly StockThemeRes[]
  open: boolean
  onOpenChange: (open: boolean) => void
  returnFocusRef: RefObject<HTMLElement | null>
}

export function StockThemesSheet({ stockName, themes, open, onOpenChange, returnFocusRef }: StockThemesSheetProps) {
  const { pathname, search } = useLocation()
  return (
    <SideSheet
      open={open}
      onOpenChange={onOpenChange}
      title={`${stockName}${josa(stockName, '이/가')} 속한 테마`}
      meta={<span className="fg-sth__meta fg-num">{`${themes.length}개 · 오늘 등락률 순`}</span>}
      closeLabel="테마 목록 닫기"
      returnFocusRef={returnFocusRef}
    >
      <ul className="fg-sth__list">
        {themesByChange(themes).map((theme) => (
          <li key={theme.id}>
            <Link to={themePath(theme.id)} state={fromState(`${pathname}${search}`)} className="fg-sth__row">
              <span className="fg-sth__name">{theme.name}</span>
              <span className="fg-sth__count fg-num">{`${theme.stockCount}종목`}</span>
              {theme.change === null ? (
                <span className="fg-sth__none">-</span>
              ) : (
                <ChangeText value={theme.change} className="fg-sth__chg" />
              )}
              <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="fg-sth__note">
        테마 분류는 외부 테마 목록을 따라 넓게 묶여 있어요 · 등락률은 테마 지수 기준이에요
      </p>
    </SideSheet>
  )
}
