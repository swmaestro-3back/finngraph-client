import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ButtonLink } from '@/components/fg/Button'
import { pageItems } from '@/lib/fg/stocks'

interface PagerProps {
  page: number
  total: number
  searchOf: (page: number) => string
  compact: boolean
  onGo: () => void
}

export function Pager({ page, total, searchOf, compact, onGo }: PagerProps) {
  if (total <= 1) return null
  const link = (target: number) => ({ search: searchOf(target) })
  const prev =
    page > 1 ? (
      <ButtonLink to={link(page - 1)} onClick={onGo} aria-label="이전 페이지">
        <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        이전
      </ButtonLink>
    ) : null
  const next =
    page < total ? (
      <ButtonLink to={link(page + 1)} onClick={onGo} aria-label="다음 페이지">
        다음
        <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
      </ButtonLink>
    ) : null
  if (compact) {
    return (
      <nav className="fg-pager" aria-label="페이지">
        {prev}
        <span className="fg-pager__now fg-num">
          <span aria-hidden="true">
            {page} / {total}
          </span>
          <span className="fg-sr">
            {total}페이지 중 {page}페이지
          </span>
        </span>
        {next}
      </nav>
    )
  }
  return (
    <nav className="fg-pager" aria-label="페이지">
      {prev}
      {pageItems(page, total).map((item, index) =>
        item === 'gap' ? (
          <span key={`gap-${index}`} className="fg-pager__gap" aria-hidden="true">
            …
          </span>
        ) : (
          <ButtonLink
            key={item}
            to={link(item)}
            onClick={onGo}
            className="fg-pager__num fg-num"
            aria-label={`${item}페이지`}
            aria-current={item === page ? 'page' : undefined}
          >
            {item}
          </ButtonLink>
        ),
      )}
      {next}
    </nav>
  )
}
