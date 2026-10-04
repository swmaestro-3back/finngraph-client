import { ExternalLink } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import type { ContractItem } from '@/lib/fg/stockContracts'
import { CONTRACT_PREVIEW } from '@/lib/fg/stockContracts'
import { stockPath } from '@/lib/fg/paths'
import { fromState } from '@/lib/navigation'

interface StockContractListProps {
  items: readonly ContractItem[]
}

export function StockContractList({ items }: StockContractListProps) {
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(false)
  const shown = open ? items : items.slice(0, CONTRACT_PREVIEW)
  return (
    <>
      <ul className="fg-dl" aria-label="공급계약 공시">
        {shown.map((item) => (
          <li key={item.key} className="fg-dl__contract fg-sfc__row">
            <span className="fg-dl__contract-top">
              <span className="fg-lg fg-sfc__who">
                {item.anon ? <i className="fg-clogo fg-clogo--24" aria-hidden="true" /> : <CompanyLogo name={item.who} size={24} />}
                {item.ticker ? (
                  <Link to={stockPath(item.ticker)} state={fromState(`${pathname}${search}`)} className="fg-sfc__name">
                    <span className="fg-sfc__nm">{item.who}</span>
                  </Link>
                ) : (
                  <b className="fg-sfc__name">
                    <span className="fg-sfc__nm">{item.who}</span>
                  </b>
                )}
              </span>
              <a className="fg-sfc__src" href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`${item.date} 공시 원문, 새 창`}>
                {item.date}
                <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
              </a>
            </span>
            <span className="fg-dl__amount">{item.amount}</span>
            <span className="fg-dl__sub">{item.sub}</span>
          </li>
        ))}
      </ul>
      {items.length > CONTRACT_PREVIEW && (
        <button type="button" className="fg-sdmore fg-sfc__more" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          {open ? '접기' : `공급계약 ${items.length}건 모두 보기`}
        </button>
      )}
    </>
  )
}
