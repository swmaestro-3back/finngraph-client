import { Fragment, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type Ref } from 'react'
import { Button } from '@/components/fg/Button'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { GapValue } from '@/components/fg/Gap'
import { ChangeText } from '@/components/fg/PriceChange'
import { ThemeRatio } from '@/components/fg/ThemeRatio'
import type { ThemeRes } from '@/lib/apiTypes'
import { formatChange, formatCompactKrw } from '@/lib/format'
import { toneClass } from '@/lib/fg/format'
import { MOTION_SLOW_MS, closesBelow, motionAllowed } from '@/lib/fg/motion'
import { themeLeader, type ChangeOf, type IssueOf } from '@/lib/fg/themes'

interface ThemeTableProps {
  themes: readonly ThemeRes[]
  total: number
  onShowAll: () => void
  selectedId: number | null
  onSelect: (id: number) => void
  changeOf: ChangeOf
  issueOf: IssueOf | null
  expanded: ReactNode
  selectedRef?: Ref<HTMLDivElement>
}

interface Expansion {
  id: number | null
  node: ReactNode
}

export function ThemeTable({
  themes,
  total,
  onShowAll,
  selectedId,
  onSelect,
  changeOf,
  issueOf,
  expanded,
  selectedRef,
}: ThemeTableProps) {
  const anchor = useRef<{ id: number; el: HTMLElement; top: number } | null>(null)
  useLayoutEffect(() => {
    const held = anchor.current
    anchor.current = null
    if (!held || held.id !== selectedId || !held.el.isConnected) return
    const shift = held.el.getBoundingClientRect().top - held.top
    if (Math.abs(shift) >= 1) window.scrollBy(0, shift)
  }, [selectedId])
  const [opened, setOpened] = useState<number | null>(null)
  const [closing, setClosing] = useState<Expansion | null>(null)
  const lastExpansion = useRef<Expansion>({ id: null, node: null })
  useLayoutEffect(() => {
    const prev = lastExpansion.current
    lastExpansion.current = { id: selectedId, node: expanded }
    if (prev.id === null || prev.id === selectedId || !prev.node || selectedId === null) return
    if (!motionAllowed() || !closesBelow(themes.map((theme) => theme.id), prev.id, selectedId)) return
    setClosing(prev)
  }, [selectedId, expanded, themes])
  useEffect(() => {
    if (!closing) return
    const timer = window.setTimeout(() => setClosing(null), MOTION_SLOW_MS)
    return () => window.clearTimeout(timer)
  }, [closing])
  const pick = (id: number, el: HTMLElement) => {
    if (id !== selectedId) {
      anchor.current = { id, el, top: el.getBoundingClientRect().top }
      setOpened(id)
    }
    onSelect(id)
  }
  return (
    <>
      <div className="fg-table-wrap fg-reveal" role="region" aria-label="테마 표" tabIndex={0}>
        <div className="fg-ttable" role="table">
          <div className="fg-trow fg-trow--head" role="row">
            <span role="columnheader">테마 · 거래대금</span>
            <span role="columnheader" className="fg-trow__num">등락률</span>
            <span role="columnheader">상승 / 하락</span>
            <span role="columnheader">주도주</span>
            <span role="columnheader">
              대표 이슈
              {!issueOf && <span className="fg-trow__gap">준비 중</span>}
            </span>
          </div>
          {themes.map((theme) => {
            const selected = theme.id === selectedId
            const change = changeOf(theme)
            const leader = themeLeader(theme)
            const issue = issueOf ? issueOf(theme) : null
            const folding = !selected && closing?.id === theme.id ? closing.node : null
            return (
              <Fragment key={theme.id}>
                <div
                  ref={selected ? selectedRef : undefined}
                  className="fg-trow"
                  role="row"
                  data-selected={selected ? 'true' : undefined}
                >
                  <span role="cell">
                    <button
                      type="button"
                      className="fg-trow__pick"
                      aria-pressed={selected}
                      onClick={(e) => pick(theme.id, e.currentTarget)}
                    >
                      <b>{theme.name}</b>
                      <small className="fg-num">
                        {theme.stockCount}종목 · 거래대금 {formatCompactKrw(theme.tradingValue)}
                      </small>
                    </button>
                  </span>
                  <span role="cell" className="fg-trow__num">
                    {change === null ? '—' : <ChangeText value={change} />}
                  </span>
                  <span role="cell">
                    <ThemeRatio up={theme.upCount ?? 0} down={theme.downCount ?? 0} />
                  </span>
                  <span role="cell" className="fg-trow__lead">
                    {leader && leader.change !== null ? (
                      <>
                        <CompanyLogo name={leader.name} size={24} />
                        <span>
                          <b>{leader.name}</b>
                          <small className={toneClass(leader.change)}>주도주 {formatChange(leader.change)}</small>
                        </span>
                      </>
                    ) : (
                      <span className="fg-trow__none">—</span>
                    )}
                  </span>
                  <span role="cell" className="fg-trow__issue" data-gap-cell={issueOf ? undefined : 'true'}>
                    {!issueOf ? (
                      <GapValue gap="theme-issue" />
                    ) : issue ? (
                      <>
                        <i className="fg-dia" aria-hidden="true" />
                        <span>
                          <b>{issue.title}</b>
                          <small>{issue.mediaCount}개 매체</small>
                        </span>
                      </>
                    ) : (
                      <span className="fg-trow__none">오늘 이슈가 없어요</span>
                    )}
                  </span>
                </div>
                {selected && expanded && (
                  <div className="fg-trow__more" role="row" data-opening={opened === theme.id ? 'true' : undefined}>
                    <div role="cell" className="fg-trow__exp">
                      <div className="fg-trow__expin">{expanded}</div>
                    </div>
                  </div>
                )}
                {folding && (
                  <div className="fg-trow__more" role="row" data-closing="true" inert>
                    <div role="cell" className="fg-trow__exp">
                      <div className="fg-trow__expin">{folding}</div>
                    </div>
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>
      </div>
      {total > themes.length && <Button onClick={onShowAll}>테마 {total}개 모두 보기</Button>}
    </>
  )
}
