import { FolderPlus, X } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { FavoriteStar } from '@/components/favorite/FavoriteStar'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { IconButton } from '@/components/fg/IconButton'
import { ChangeText } from '@/components/fg/PriceChange'
import type { FavoriteItemRes, FolderSummaryRes } from '@/lib/apiTypes'
import { KIND_SHORT_LABELS, daysBetween } from '@/lib/calendar'
import { itemName, type StockSignal } from '@/lib/fg/folders'
import { formatGapPct, formatPriceWon, marketLabel } from '@/lib/fg/format'
import { issuePath, stockPath } from '@/lib/fg/paths'
import { fromState } from '@/lib/navigation'

const NEAR_HIGH_PCT = -5

function dayWord(days: number): string {
  return days === 0 ? '오늘' : `D-${days}`
}

function highLabel(gap: number): string {
  return gap >= -0.05 ? '52주 신고가' : `신고가까지 ${formatGapPct(gap)}`
}

interface FavoriteRowProps {
  item: FavoriteItemRes
  signal: StockSignal | null
  today: string
  folder: Pick<FolderSummaryRes, 'id' | 'name'> | null
  editing: boolean
  onOrganize: (item: FavoriteItemRes, anchor: HTMLElement) => void
  onTakeOut: (item: FavoriteItemRes) => void
}

export function FavoriteRow({ item, signal, today, folder, editing, onOrganize, onTakeOut }: FavoriteRowProps) {
  const { pathname, search } = useLocation()
  const name = itemName(item)
  const to = stockPath(item.key)
  const change = item.stock?.change ?? null
  const state = fromState(`${pathname}${search}`)
  const event = signal?.event ?? null
  const issue = signal?.issue ?? null
  const gap = signal?.gap ?? null

  return (
    <li className="fg-mine__row">
      <FavoriteStar type={item.type} targetKey={item.key} label={name} className="fg-mine__star" />
      <CompanyLogo name={name} ticker={item.key} size={32} className="fg-mine__logo" />
      <div className="fg-mine__id">
        {item.resolved ? (
          <Link to={to} state={state} className="fg-mine__name">
            {name}
          </Link>
        ) : (
          <span className="fg-mine__gone">{`${item.key} · 더 이상 제공되지 않는 대상이에요`}</span>
        )}
        {item.resolved && item.stock && (
          <span className="fg-mine__meta fg-num">{`${marketLabel(item.stock.market)} · ${item.stock.ticker}`}</span>
        )}
        {gap !== null && gap >= NEAR_HIGH_PCT && <span className="fg-mine__tag fg-mine__tag--up">{highLabel(gap)}</span>}
        {issue && (
          <Link to={issuePath(issue.id)} state={state} className="fg-mine__tag fg-mine__tag--event">
            오늘 이슈
          </Link>
        )}
        {event && (
          <span className="fg-mine__tag fg-mine__tag--event">{`${KIND_SHORT_LABELS[event.kind]} ${dayWord(daysBetween(today, event.date))}`}</span>
        )}
      </div>
      <p className="fg-mine__px fg-num">
        {item.stock?.price != null && <span className="fg-mine__price">{formatPriceWon(item.stock.price)}</span>}
        {change !== null ? <ChangeText value={change} className="fg-mine__chg" /> : <span className="fg-mine__chg">–</span>}
      </p>
      {editing && (
        <div className="fg-mine__acts">
          <IconButton label={`${name} 테마에 담기`} title="테마에 담기" onClick={(event) => onOrganize(item, event.currentTarget)}>
            <FolderPlus size={18} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
          {folder && (
            <IconButton label={`${name} ${folder.name}에서 빼기`} title="이 테마에서 빼기" onClick={() => onTakeOut(item)}>
              <X size={18} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
          )}
        </div>
      )}
    </li>
  )
}
