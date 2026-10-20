import { Link, useLocation } from 'react-router-dom'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import type { FavoriteItemRes } from '@/lib/apiTypes'
import { formatChange } from '@/lib/format'
import { itemName } from '@/lib/fg/folders'
import { toneClass } from '@/lib/fg/format'
import { themePath } from '@/lib/fg/paths'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

export function ThemeCards({ items }: { items: readonly FavoriteItemRes[] }) {
  const { pathname, search } = useLocation()
  const state = fromState(`${pathname}${search}`)
  return (
    <ul className="fg-mine__themes" aria-label="관심 테마">
      {items.map((item) => {
        const name = itemName(item)
        const change = item.theme?.weightedChange ?? null
        return (
          <li key={item.key} className="fg-mine__theme">
            {item.resolved ? (
              <Link to={themePath(item.key)} state={state} className="fg-mine__themelink">
                <span className="fg-mine__themename">{name}</span>
                <span className="fg-mine__themenums fg-num">
                  <b className={cn('fg-mine__themechg', toneClass(change))}>{change === null ? '–' : formatChange(change)}</b>
                  <span>{`종목 ${item.theme?.stockCount ?? 0}개`}</span>
                </span>
              </Link>
            ) : (
              <span className="fg-mine__themelink fg-mine__themelink--gone">더 이상 제공되지 않는 테마예요</span>
            )}
            <FavoriteStar type="THEME" targetKey={item.key} label={name} className="fg-mine__themestar" />
          </li>
        )
      })}
    </ul>
  )
}
