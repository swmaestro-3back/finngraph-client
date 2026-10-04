import type { ReactNode, Ref } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { GapValue, MockBadge } from '@/components/fg/Gap'
import { ThemeGraphLink, ThemeStar } from '@/components/fg/ThemeActions'
import { ThemeRatio } from '@/components/fg/ThemeRatio'
import type { ThemeRes } from '@/lib/apiTypes'
import { formatChange, formatCompactKrw } from '@/lib/format'
import { toneClass } from '@/lib/fg/format'
import { issuePath } from '@/lib/fg/paths'
import type { ChangeOf, IssueOf } from '@/lib/fg/themes'

interface ThemePanelProps {
  theme: ThemeRes
  changeOf: ChangeOf | null
  issueOf: IssueOf | null
  members: ReactNode
  ref?: Ref<HTMLElement>
}

export function ThemePanel({ theme, changeOf, issueOf, members, ref }: ThemePanelProps) {
  const change = changeOf ? changeOf(theme) : null
  const issue = issueOf ? issueOf(theme) : null
  const up = theme.upCount ?? 0
  const down = theme.downCount ?? 0
  return (
    <section ref={ref} className="fg-section fg-tdet fg-rail__wide" aria-labelledby="fg-tdet-name">
      <div className="fg-tdet__kick">
        <Badge>고른 테마</Badge>
        <span className="fg-tdet__count fg-num">{theme.stockCount}종목</span>
        {(changeOf || issueOf) && <MockBadge />}
        <ThemeStar theme={theme} />
      </div>
      <h2 id="fg-tdet-name" className="fg-tdet__name">
        {theme.name}
      </h2>
      <div className="fg-tdet__chg">
        {!changeOf ? (
          <GapValue gap="theme-weighted-change" label="등락률 준비 중" className="fg-tdet__gap" />
        ) : change === null ? (
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
      <div className="fg-tdet__acts">
        <ThemeGraphLink theme={theme} />
      </div>
    </section>
  )
}
