// Lucian UX/UI Prompt #043 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#043
import { useLayoutEffect, useRef, useState } from 'react'
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

type PagerDir = 'l' | 'r'

function usePagerMark(page: number, enabled: boolean) {
  const ref = useRef<HTMLElement>(null)
  const [dir, setDir] = useState<PagerDir>('r')
  const [shown, setShown] = useState(page)
  if (shown !== page) {
    setShown(page)
    setDir(page < shown ? 'l' : 'r')
  }
  useLayoutEffect(() => {
    const nav = ref.current
    if (!enabled || !nav) return
    const place = () => {
      const now = nav.querySelector<HTMLElement>('.fg-pager__num[aria-current="page"]')
      if (!now) return
      const left = now.offsetLeft
      nav.style.setProperty('--l', `${left}px`)
      nav.style.setProperty('--r', `${nav.clientWidth - left - now.offsetWidth}px`)
    }
    place()
    const frame = requestAnimationFrame(() => nav.setAttribute('data-ready', ''))
    const observer = new ResizeObserver(place)
    observer.observe(nav)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [page, enabled])
  return { ref, dir }
}

export function Pager({ page, total, searchOf, compact, onGo }: PagerProps) {
  const mark = usePagerMark(page, !compact && total > 1)
  if (total <= 1) return null
  const link = (target: number) => ({ search: searchOf(target) })
  const prev =
    page > 1 ? (
      <ButtonLink to={link(page - 1)} onClick={onGo} className="fg-pager__arrow" aria-label="이전 페이지">
        <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
        <span className="fg-pager__word">이전</span>
      </ButtonLink>
    ) : null
  const next =
    page < total ? (
      <ButtonLink to={link(page + 1)} onClick={onGo} className="fg-pager__arrow" aria-label="다음 페이지">
        <span className="fg-pager__word">다음</span>
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
    <nav ref={mark.ref} className="fg-pager fg-pager--rail" aria-label="페이지" data-dir={mark.dir}>
      <span className="fg-pager__ind" aria-hidden="true" />
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
