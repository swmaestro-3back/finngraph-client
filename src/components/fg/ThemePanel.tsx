import type { ReactNode, Ref } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { GapValue, MockBadge } from '@/components/fg/Gap'
import { ThemeDetailLink, ThemeGraphLink, ThemeStar } from '@/components/fg/ThemeActions'
import { ThemeRatio } from '@/components/fg/ThemeRatio'
import type { ThemeRes } from '@/lib/apiTypes'
import { formatChange, formatCompactKrw } from '@/lib/format'
import { toneClass } from '@/lib/fg/format'
import { issuePath, themePath } from '@/lib/fg/paths'
import type { ChangeOf, IssueOf } from '@/lib/fg/themes'
import { fromState } from '@/lib/navigation'

interface ThemePanelProps {
  theme: ThemeRes
  changeOf: ChangeOf
  issueOf: IssueOf | null
  members: ReactNode
  ref?: Ref<HTMLElement>
}

export function ThemePanel({ theme, changeOf, issueOf, members, ref }: ThemePanelProps) {
  const { pathname, search } = useLocation()
  const change = changeOf(theme)
  const issue = issueOf ? issueOf(theme) : null
  const up = theme.upCount ?? 0
  const down = theme.downCount ?? 0
  return (
    <section ref={ref} className="fg-section fg-tdet fg-rail__wide fg-reveal" aria-labelledby="fg-tdet-name">
      <div className="fg-tdet__kick">
        <Badge>고른 테마</Badge>
        <span className="fg-tdet__count fg-num">{theme.stockCount}종목</span>
        {issueOf && <MockBadge />}
        <ThemeStar theme={theme} />
      </div>
      <h2 id="fg-tdet-name" className="fg-tdet__name">
        <Link to={themePath(theme.id)} state={fromState(`${pathname}${search}`)} title="테마 상세 보기">
          {theme.name}
          <span className="fg-tdet__chev" aria-hidden="true">
            ›
          </span>
        </Link>
      </h2>
      <div className="fg-tdet__chg">
        {change === null ? (
          <b>—</b>
        ) : (
          <b className={toneClass(change)}>{formatChange(change)}</b>
        )}
        <span className="fg-num">
          {up}개 오르고 {down}개 내렸어요
        </span>
      </div>
      <ThemeRatio up={up} down={down} large caption={false} />
      <dl className="fg-tdet__stats">
        <div>
          <dt>시가총액 합</dt>
          <dd className="fg-num">{formatCompactKrw(theme.marketCap)}</dd>
        </div>
        <div>
          <dt>거래대금</dt>
          <dd className="fg-num">{formatCompactKrw(theme.tradingValue)}</dd>
        </div>
      </dl>
      <div className="fg-tdet__acts">
        <ThemeDetailLink theme={theme} />
        <ThemeGraphLink theme={theme} />
      </div>
      <div className="fg-tdet__sec">
        <span className="fg-tdet__label">대표 이슈</span>
        {!issueOf ? (
          <GapValue gap="theme-issue" label="준비 중이에요" className="fg-tdet__none" />
        ) : issue ? (
          <Link to={issuePath(issue.id)} className="fg-tdet__issue">
            <i className="fg-dia" aria-hidden="true" />
            <span>
              <b>{issue.title}</b>
              <small>{issue.mediaCount}개 매체 보도 · 이 테마 종목이 나온 이슈</small>
            </span>
          </Link>
        ) : (
          <p className="fg-tdet__none">오늘 이 테마 종목이 나온 이슈가 없어요</p>
        )}
      </div>
      <div className="fg-tdet__sec">
        <span className="fg-tdet__label">테마 종목 · 오늘 등락률 순</span>
        {members}
      </div>
    </section>
  )
}
