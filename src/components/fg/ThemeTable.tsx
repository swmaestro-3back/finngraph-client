// Lucian UX/UI Prompt #317 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#317
import { Fragment, type CSSProperties, type ReactNode, type Ref } from 'react'
import { CompanyLogo } from '@/components/fg/CompanyLogo'
import { ChangeText } from '@/components/fg/PriceChange'
import { RowExpansion } from '@/components/fg/RowExpansion'
import { ThemeAverageLine } from '@/components/fg/ThemeAverageLine'
import { ThemeRatio } from '@/components/fg/ThemeRatio'
import type { ThemeRes } from '@/lib/apiTypes'
import { formatChange, formatCompactKrw } from '@/lib/format'
import { toneClass } from '@/lib/fg/format'
import { themeLeader, type ChangeOf, type IssueOf } from '@/lib/fg/themes'
import { useFlipRows } from '@/lib/fg/useFlipRows'
import { useRowFold } from '@/lib/fg/useRowFold'

interface ThemeTableProps {
  themes: readonly ThemeRes[]
  selectedId: number | null
  onSelect: (id: number) => void
  changeOf: ChangeOf
  issueOf: IssueOf | null
  expanded: ReactNode
  selectedRef?: Ref<HTMLDivElement>
}

export function ThemeTable({
  themes,
  selectedId,
  onSelect,
  changeOf,
  issueOf,
  expanded,
  selectedRef,
}: ThemeTableProps) {
  const { hold, opened, closing } = useRowFold(
    themes.map((theme) => theme.id),
    selectedId,
    expanded,
  )
  const flip = useFlipRows<HTMLDivElement>(themes.map((theme) => theme.id).join())
  const pick = (id: number, el: HTMLElement) => {
    hold(id, el)
    onSelect(id)
  }
  return (
    <>
      <div className="fg-table-wrap fg-reveal" role="region" aria-label="테마 표" tabIndex={0}>
        <div ref={flip} className="fg-ttable" role="table">
          <div className="fg-trow fg-trow--head" role="row">
            <span role="columnheader">테마 · 거래대금</span>
            <span role="columnheader" className="fg-trow__num">등락률</span>
            <span role="columnheader">상승 / 하락</span>
            <span role="columnheader">주도주</span>
            <span role="columnheader">대표 이슈</span>
          </div>
          {themes.map((theme, index) => {
            const selected = theme.id === selectedId
            const change = changeOf(theme)
            const leader = themeLeader(theme)
            const issue = issueOf ? issueOf(theme) : null
            const folding = !selected && closing?.key === theme.id ? closing.node : null
            return (
              <Fragment key={theme.id}>
                <div
                  ref={selected ? selectedRef : undefined}
                  className="fg-trow"
                  role="row"
                  data-selected={selected ? 'true' : undefined}
                  data-flip={theme.id}
                  style={{ '--fg-i': index } as CSSProperties}
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
                    <span className="fg-trow__numstack">
                      {change === null ? '—' : <ChangeText value={change} />}
                      <ThemeAverageLine theme={theme} className="fg-trow__avg" />
                    </span>
                  </span>
                  <span role="cell">
                    <ThemeRatio up={theme.upCount ?? 0} down={theme.downCount ?? 0} />
                  </span>
                  <span role="cell" className="fg-trow__lead">
                    {leader && leader.change !== null ? (
                      <>
                        <CompanyLogo name={leader.name} ticker={leader.ticker} size={24} />
                        <span>
                          <b>{leader.name}</b>
                          <small className={toneClass(leader.change)}>주도주 {formatChange(leader.change)}</small>
                        </span>
                      </>
                    ) : (
                      <span className="fg-trow__none">—</span>
                    )}
                  </span>
                  <span role="cell" className="fg-trow__issue">
                    {!issueOf ? (
                      <span className="fg-trow__none">—</span>
                    ) : issue ? (
                      <>
                        <i className="fg-dia" aria-hidden="true" />
                        <span>
                          <b title={issue.title}>{issue.title}</b>
                          <small>{issue.mediaCount}개 매체</small>
                        </span>
                      </>
                    ) : (
                      <span className="fg-trow__none">나온 이슈가 없어요</span>
                    )}
                  </span>
                </div>
                {selected && expanded && <RowExpansion opening={opened === theme.id}>{expanded}</RowExpansion>}
                {folding && <RowExpansion closing>{folding}</RowExpansion>}
              </Fragment>
            )
          })}
        </div>
      </div>
    </>
  )
}
