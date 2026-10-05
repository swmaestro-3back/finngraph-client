import type { Ref } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/fg/Badge'
import { MockBadge } from '@/components/fg/Gap'
import { ISSUE_TABS, issueTabSearch, type IssueHead as IssueHeadModel, type IssueTab } from '@/lib/fg/issuePage'
import { navState } from '@/lib/fg/stockDetail'

interface IssueTabsProps {
  current: IssueTab
  counts: IssueHeadModel['counts']
  ref?: Ref<HTMLElement>
}

export function IssueTabs({ current, counts, ref }: IssueTabsProps) {
  const { pathname, search, state } = useLocation()
  return (
    <nav ref={ref} className="fg-sdtabs fg-ish__tabs" aria-label="이슈 보기">
      <ul className="fg-ptabs">
        {ISSUE_TABS.map((tab) => (
          <li key={tab.value}>
            <Link
              to={{ pathname, search: issueTabSearch(search, tab.value) }}
              state={navState(state)}
              replace
              className="fg-ptab"
              aria-current={tab.value === current ? 'page' : undefined}
            >
              {tab.label}
              {tab.value !== 'summary' && <b className="fg-ptab__count fg-num">{counts[tab.value]}</b>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

interface IssueHeadProps {
  title: string
  head: IssueHeadModel
  tab: IssueTab
  mock: boolean
  tabsRef?: Ref<HTMLElement>
}

export function IssueHead({ title, head, tab, mock, tabsRef }: IssueHeadProps) {
  return (
    <section className="fg-section fg-ish" aria-labelledby="fg-ish-title">
      <div className="fg-ish__meta fg-num">
        {head.badge && <Badge tone={head.tone}>{head.badge}</Badge>}
        <span className="fg-ish__cap">
          <b>{head.media}</b>
          {head.when ? ` 보도 · ${head.when}` : ' 보도'}
          {head.since && <span className="fg-ish__since">{` · ${head.since}`}</span>}
        </span>
        {mock && <MockBadge />}
      </div>
      <h1 id="fg-ish-title" className="fg-ish__title">
        {title}
      </h1>
      {head.keywords.length > 0 && (
        <div className="fg-ish__keys">
          <span className="fg-ish__klabel" id="fg-ish-keys">
            키워드
          </span>
          <ul aria-labelledby="fg-ish-keys">
            {head.keywords.map((keyword) => (
              <li key={keyword}>
                <Badge>{keyword}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
      <IssueTabs ref={tabsRef} current={tab} counts={head.counts} />
    </section>
  )
}
