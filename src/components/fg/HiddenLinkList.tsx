import { ChevronDown, Star } from 'lucide-react'
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
  hasQuote,
  LINK_SORTS,
  linkCaption,
  linkChips,
  linkEvidenceCount,
  linkPath,
  sortLinks,
  watchLabel,
  type LinkedCompany,
  type LinkFilter,
  type LinkSort,
} from '@/lib/fg/stockLinks'
import { fromState } from '@/lib/navigation'
import { cn } from '@/lib/utils'

export const STRENGTH_NOTE =
  '근거 강도는 AI가 찾은 근거의 양과 출처를 보고 매긴 신뢰도예요. 높을수록 관계가 확실하다는 뜻이고, 주가가 오른다는 뜻은 아니에요.'

export const LINK_LIST_PAGE = 20

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

export function HiddenLinkHead() {
  return (
    <li className="fg-hlist__row fg-hlist__row--head" aria-hidden="true">
      <span>기업</span>
      <span>어떻게 이어졌나</span>
      <span className="fg-hlist__end">현재가</span>
      <span className="fg-hlist__end">52주 최고 대비</span>
      <span>근거 강도</span>
      <span />
    </li>
  )
}

interface HiddenLinkRowProps {
  company: LinkedCompany
  meta: string
  openLabel: string
  watched: boolean | null
  onToggleWatch: () => void
  onOpen: () => void
}

function GapCell({ company }: { company: LinkedCompany }) {
  if (company.newHigh) {
    return (
      <span>
        <span className="fg-sr">52주 최고 </span>경신
      </span>
    )
  }
  return (
    <span>
      <span className="fg-sr">52주 최고 대비 </span>
      {company.gapFromHigh === null ? '—' : formatGapPct(company.gapFromHigh)}
    </span>
  )
}

export function HiddenLinkRow({ company, meta, openLabel, watched, onToggleWatch, onOpen }: HiddenLinkRowProps) {
  const { pathname, search } = useLocation()
  return (
    <li className="fg-hlist__row">
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
        <span className="fg-hlist__path">{meta}</span>
      </div>
      <div className="fg-hlist__price fg-num">
        {company.price !== null ? (
          <b>{formatPriceWon(company.price)}</b>
        ) : (
          <b>
            <span aria-hidden="true">—</span>
            <span className="fg-sr">시세 없음</span>
          </b>
        )}
        {company.change !== null && <span className={toneClass(company.change)}>{formatChange(company.change)}</span>}
      </div>
      <div className="fg-hlist__gap fg-num">
        {hasQuote(company) ? <GapCell company={company} /> : <span aria-hidden="true">—</span>}
        {company.position !== null && <GapBar position={company.position} />}
      </div>
      <div className="fg-strength fg-hlist__str">
        <span className="fg-sr">근거 강도 </span>
        <StrengthBars strength={company.strength} />
        <b>{STRENGTH_LABEL[company.strength]}</b>
      </div>
      <div className="fg-hlist__acts">
        <Button aria-haspopup="dialog" onClick={onOpen}>
          {openLabel}
        </Button>
        {watched !== null && (
          <IconButton label={watchLabel(company.name, watched)} aria-pressed={watched} onClick={onToggleWatch}>
            <Star size={20} strokeWidth={1.75} fill={watched ? 'currentColor' : 'none'} aria-hidden="true" />
          </IconButton>
        )}
      </div>
    </li>
  )
}

interface HiddenLinkListProps {
  stockName: string
  companies: readonly LinkedCompany[]
  watchedOf: (company: LinkedCompany) => boolean | null
  onToggleWatch: (company: LinkedCompany) => void
  onOpen: (id: string) => void
}

export function HiddenLinkList({ stockName, companies, watchedOf, onToggleWatch, onOpen }: HiddenLinkListProps) {
  const [filter, setFilter] = useState<LinkFilter>('all')
  const [sort, setSort] = useState<LinkSort>('strength')
  const [limit, setLimit] = useState(LINK_LIST_PAGE)
  const rows = sortLinks(filterLinks(companies, filter), sort)
  const shown = rows.slice(0, limit)
  const more = rows.length - shown.length
  const pickFilter = (next: LinkFilter) => {
    setFilter(next)
    setLimit(LINK_LIST_PAGE)
  }
  return (
    <>
      <div className="fg-hlist__tools">
        <FilterChipGroup label="관계 유형으로 거르기" options={linkChips(companies)} value={filter} onChange={pickFilter} className="fg-hlist__chips" />
        <Segment label="정렬" options={LINK_SORTS} value={sort} onChange={setSort} />
      </div>
      <h2 id="fg-hlist-title" className="fg-sr">
        이어진 기업 목록
      </h2>
      <span className="fg-hlist__cap fg-num" aria-live="polite">
        {linkCaption(filter, rows.length, sort)}
      </span>
      <ul className="fg-hlist" aria-label="이어진 기업 목록">
        <HiddenLinkHead />
        {shown.map((company) => (
          <HiddenLinkRow
            key={company.id}
            company={company}
            meta={linkPath(stockName, company)}
            openLabel={`근거 ${linkEvidenceCount(company)}건`}
            watched={watchedOf(company)}
            onToggleWatch={() => onToggleWatch(company)}
            onOpen={() => onOpen(company.id)}
          />
        ))}
      </ul>
      {more > 0 && (
        <Button className="fg-hlist__more" onClick={() => setLimit(rows.length)}>
          {`${more}곳 더 보기`}
          <ChevronDown size={16} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      )}
      <Disclaimer text={STRENGTH_NOTE} className="fg-snote" />
    </>
  )
}
