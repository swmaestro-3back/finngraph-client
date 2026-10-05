import { ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/fg/Button'
import { ChangeText } from '@/components/fg/PriceChange'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { formatChange } from '@/lib/format'
import { formatPriceWon, toneClass } from '@/lib/fg/format'
import {
  linkMapGroups,
  MAP_MORE_KEYS,
  mapHeads,
  nodeAria,
  nodeTag,
  type LinkedCompany,
  type MapGroupKey,
} from '@/lib/fg/stockLinks'
import { cn } from '@/lib/utils'

export const MAP_GROUP_LIMIT = 5

interface RelationMapProps {
  name: string
  price: number | null
  change: number | null
  companies: readonly LinkedCompany[]
  onOpen: (id: string) => void
}

export function RelationMap({ name, price, change, companies, onOpen }: RelationMapProps) {
  const [open, setOpen] = useState<Partial<Record<MapGroupKey, boolean>>>({})
  const groups = linkMapGroups(companies)
  const heads = mapHeads(name, groups)
  const node = (company: LinkedCompany) => (
    <button
      key={company.id}
      type="button"
      className={cn('fg-rnode', !company.confirmed && 'fg-rnode--inferred')}
      aria-haspopup="dialog"
      aria-label={nodeAria(company)}
      onClick={() => onOpen(company.id)}
    >
      <span className="fg-rnode__who">
        <CompanyLogo name={company.name} />
        <span className="fg-rnode__name">
          <b>{company.name}</b>
          <small>{nodeTag(company)}</small>
        </span>
      </span>
      {company.change !== null && (
        <span className={cn('fg-rnode__chg', toneClass(company.change))}>{formatChange(company.change)}</span>
      )}
    </button>
  )
  const shown = (key: MapGroupKey) => (open[key] ? groups[key] : groups[key].slice(0, MAP_GROUP_LIMIT))
  const toggle = (key: MapGroupKey) => {
    const rest = groups[key].length - MAP_GROUP_LIMIT
    if (rest <= 0) return null
    return (
      <Button
        variant="text"
        size="sm"
        className="fg-rmap__toggle"
        aria-expanded={open[key] === true}
        onClick={() => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))}
      >
        {open[key] ? '접기' : `${rest}곳 더 보기`}
        {open[key] ? (
          <ChevronUp size={16} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
        )}
      </Button>
    )
  }
  const side = (key: 'supply' | 'customer') =>
    groups[key].length > 0 ? (
      <>
        <div className="fg-rmap__nodes">{shown(key).map(node)}</div>
        {toggle(key)}
      </>
    ) : (
      <span className="fg-rmap__none">아직 확인된 곳이 없어요</span>
    )
  const more = MAP_MORE_KEYS.filter((key) => groups[key].length > 0)
  return (
    <div
      className={cn(
        'fg-rmap',
        groups.supply.length === 0 && 'fg-rmap--no-in',
        groups.customer.length === 0 && 'fg-rmap--no-out',
      )}
      role="group"
      aria-label="관계 지도"
    >
      <div className="fg-rmap__col fg-rmap__col--in">
        <span className="fg-rmap__head">{heads.supply}</span>
        {side('supply')}
      </div>
      <div className="fg-rmap__center">
        <CompanyLogo name={name} size={40} />
        <span className="fg-rmap__id">
          <b>{name}</b>
          {price !== null && (
            <span>
              {formatPriceWon(price)} {change !== null && <ChangeText value={change} />}
            </span>
          )}
        </span>
      </div>
      <div className="fg-rmap__col fg-rmap__col--out">
        <span className="fg-rmap__head">{heads.customer}</span>
        {side('customer')}
      </div>
      {more.length > 0 && (
        <div className="fg-rmap__more">
          {more.map((key) => (
            <div key={key} className="fg-rmap__col">
              <span className="fg-rmap__head">{heads[key]}</span>
              {shown(key).map(node)}
              {toggle(key)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
