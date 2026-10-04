import { Star } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { Disclaimer } from '@/components/fg/Disclaimer'
import { FilterChipGroup } from '@/components/fg/FilterChip'
import { IconButton } from '@/components/fg/IconButton'
import { Segment } from '@/components/fg/SegmentedTabs'
import { formatChange } from '@/lib/format'
import { formatGapPct, formatPriceWon, marketLabel, toneClass } from '@/lib/fg/format'
import { stockPath } from '@/lib/fg/paths'
import { STRENGTH_LABEL } from '@/lib/fg/stockDetail'
import {
  filterLinks,
  LINK_SORTS,
  linkCaption,
  linkChips,
  linkPath,
  sortLinks,
  watchLabel,
  type LinkedCompany,
  type LinkFilter,
  type LinkSort,
} from '@/lib/fg/stockLinks'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

const STRENGTH_NOTE =
  '근거 강도는 AI가 찾은 근거의 양과 출처를 보고 매긴 신뢰도예요. 높을수록 관계가 확실하다는 뜻이고, 주가가 오른다는 뜻은 아니에요.'

export function StrengthBars({ strength }: { strength: LinkedCompany['strength'] }) {
  return (
    <>
      {[1, 2, 3].map((bar) => (
        <i key={bar} className={cn(bar <= strength && 'on')} aria-hidden="true" />
      ))}
    </>
  )
}

export function GapBar({ position }: { position: number }) {
  return (
    <span className="fg-gbar" aria-hidden="true">
      <i style={{ left: `${(Math.min(1, Math.max(0, position)) * 100).toFixed(1)}%` }} />
    </span>
  )
}

interface HiddenLinkListProps {
  stockName: string
  companies: readonly LinkedCompany[]
  watched: Readonly<Record<string, boolean>>
  onToggleWatch: (id: string) => void
  onOpen: (id: string) => void
}

export function HiddenLinkList({ stockName, companies, watched, onToggleWatch, onOpen }: HiddenLinkListProps) {
  const { pathname, search } = useLocation()
  const [filter, setFilter] = useState<LinkFilter>('all')
  const [sort, setSort] = useState<LinkSort>('strength')
  const rows = sortLinks(filterLinks(companies, filter), sort)
  return (
    <>
      <div className="fg-hlist__tools">
        <FilterChipGroup label="관계 유형으로 거르기" options={linkChips(companies)} value={filter} onChange={setFilter} className="fg-hlist__chips" />
        <Segment label="정렬" options={LINK_SORTS} value={sort} onChange={setSort} />
      </div>
      <h2 id="fg-hlist-title" className="fg-sr">
        이어진 기업 목록
      </h2>
      <span className="fg-hlist__cap fg-num" aria-live="polite">
        {linkCaption(filter, rows.length, sort)}
      </span>
      <ul className="fg-hlist" aria-label="이어진 기업 목록">
        <li className="fg-hlist__row fg-hlist__row--head" aria-hidden="true">
          <span>기업</span>
          <span>어떻게 이어졌나</span>
          <span className="fg-hlist__end">현재가</span>
          <span className="fg-hlist__end">52주 최고 대비</span>
          <span>근거 강도</span>
          <span />
        </li>
        {rows.map((company) => {
          const on = watched[company.id] === true
          return (
            <li key={company.id} className="fg-hlist__row">
              <div className="fg-hlist__name">
                <CompanyLogo name={company.name} />
                <span className="fg-hlist__nm">
                  {company.code ? (
                    <Link to={stockPath(company.code)} state={fromState(`${pathname}${search}`)} className="fg-hlist__link">
                      {company.name}
                    </Link>
                  ) : (
                    <span className="fg-hlist__link">{company.name}</span>
                  )}
                  <span>{marketLabel(company.market)}</span>
                </span>
              </div>
              <div className="fg-hlist__rel">
                <span className="fg-slr__rel">{company.relation}</span>
                <span className="fg-hlist__path">{linkPath(stockName, company)}</span>
              </div>
              <div className="fg-hlist__price fg-num">
                <b>{formatPriceWon(company.price)}</b>
                <span className={toneClass(company.change)}>{formatChange(company.change)}</span>
              </div>
              <div className="fg-hlist__gap fg-num">
                <span>
                  <span className="fg-sr">52주 최고 대비 </span>
                  {formatGapPct(company.gapFromHigh)}
                </span>
                <GapBar position={company.position} />
              </div>
              <div className="fg-strength fg-hlist__str">
                <span className="fg-sr">근거 강도 </span>
                <StrengthBars strength={company.strength} />
                <b>{STRENGTH_LABEL[company.strength]}</b>
              </div>
              <div className="fg-hlist__acts">
                <Button aria-haspopup="dialog" onClick={() => onOpen(company.id)}>
                  {`근거 ${company.evidence.length}건`}
                </Button>
                <IconButton label={watchLabel(company.name, on)} aria-pressed={on} onClick={() => onToggleWatch(company.id)}>
                  <Star size={20} strokeWidth={1.75} fill={on ? 'currentColor' : 'none'} aria-hidden="true" />
                </IconButton>
              </div>
            </li>
          )
        })}
      </ul>
      <Disclaimer text={STRENGTH_NOTE} className="fg-snote" />
    </>
  )
}
