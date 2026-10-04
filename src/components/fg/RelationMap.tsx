import { ChangeText } from '@/components/fg/PriceChange'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { formatChange } from '@/lib/format'
import { formatPriceWon, toneClass } from '@/lib/fg/format'
import { linkMapGroups, mapHeads, nodeAria, nodeTag, type LinkedCompany } from '@/lib/fg/stockLinks'
import { cn } from '@/lib/utils'

interface RelationMapProps {
  name: string
  price: number | null
  change: number | null
  companies: readonly LinkedCompany[]
  onOpen: (id: string) => void
}

type MoreKey = 'invest' | 'theme' | 'second'

const MORE_KEYS: readonly MoreKey[] = ['invest', 'theme', 'second']

export function RelationMap({ name, price, change, companies, onOpen }: RelationMapProps) {
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
      <span className={cn('fg-rnode__chg', toneClass(company.change))}>{formatChange(company.change)}</span>
    </button>
  )
  const more = MORE_KEYS.filter((key) => groups[key].length > 0)
  return (
    <div className="fg-rmap" role="group" aria-label="관계 지도">
      <div className="fg-rmap__col fg-rmap__col--in">
        <span className="fg-rmap__head">{heads.supply}</span>
        <div className="fg-rmap__nodes">{groups.supply.map(node)}</div>
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
        <div className="fg-rmap__nodes">{groups.customer.map(node)}</div>
      </div>
      {more.length > 0 && (
        <div className="fg-rmap__more">
          {more.map((key) => (
            <div key={key} className="fg-rmap__col">
              <span className="fg-rmap__head">{heads[key]}</span>
              {groups[key].map(node)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
